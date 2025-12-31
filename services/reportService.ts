import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { SimulationResult } from '../types'
import { zpixFont } from './fontData'

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

export const generateProfessionalReport = async (results: SimulationResult[]) => {
  const doc = new jsPDF('p', 'mm', 'a4')

  // Add custom font for Chinese support
  doc.addFileToVFS('zpix.ttf', zpixFont)
  doc.addFont('zpix.ttf', 'zpix', 'normal')
  doc.addFont('zpix.ttf', 'zpix', 'bold')
  const defaultFont = 'zpix'

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = 20

  // Colors
  const primaryColor: [number, number, number] = [30, 64, 175] // Blue
  const textColor: [number, number, number] = [30, 41, 59] // Slate-800
  const mutedColor: [number, number, number] = [100, 116, 139] // Slate-500

  // === HEADER ===
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont(defaultFont, 'bold')
  doc.text('Strategy Performance Report', margin, 18)

  doc.setFontSize(10)
  doc.setFont(defaultFont, 'normal')
  doc.text(`Generated: ${new Date().toLocaleDateString()} | CLEC Strategy Backtester`, margin, 28)

  yPos = 45

  // === EXECUTIVE SUMMARY ===
  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont(defaultFont, 'bold')
  doc.text('Executive Summary', margin, yPos)
  yPos += 8

  // Find best performers for summary
  const bestByBalance = [...results].sort(
    (a, b) => b.metrics.finalBalance - a.metrics.finalBalance,
  )[0]
  const bestByIRR = [...results].sort((a, b) => b.metrics.irr - a.metrics.irr)[0]
  const lowestDrawdown = [...results].sort(
    (a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown,
  )[0]

  doc.setFontSize(10)
  doc.setFont(defaultFont, 'normal')
  doc.setTextColor(...mutedColor)

  const summaryText = [
    `Best Final Balance: ${bestByBalance.strategyName} ($${Math.round(bestByBalance.metrics.finalBalance).toLocaleString()})`,
    `Highest IRR: ${bestByIRR.strategyName} (${bestByIRR.metrics.irr.toFixed(2)}%)`,
    `Lowest Max Drawdown: ${lowestDrawdown.strategyName} (${lowestDrawdown.metrics.maxDrawdown.toFixed(2)}%)`,
  ]

  summaryText.forEach((line) => {
    doc.text(line, margin, yPos)
    yPos += 5
  })
  yPos += 5

  // === PERFORMANCE METRICS TABLE ===
  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont(defaultFont, 'bold')
  doc.text('Performance Metrics', margin, yPos)
  yPos += 5

  const tableHeaders = [
    'Strategy',
    'Final Balance',
    'CAGR',
    'IRR',
    'Max DD',
    'Sharpe',
    'Calmar',
    'Pain Index',
  ]

  const tableData = results.map((r) => [
    r.strategyName,
    `$${Math.round(r.metrics.finalBalance).toLocaleString()}`,
    `${r.metrics.cagr.toFixed(2)}%`,
    `${r.metrics.irr.toFixed(2)}%`,
    `${r.metrics.maxDrawdown.toFixed(2)}%`,
    r.metrics.sharpeRatio.toFixed(2),
    r.metrics.calmarRatio.toFixed(2),
    r.metrics.painIndex.toFixed(2),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      font: defaultFont,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
      font: defaultFont,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', font: defaultFont },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  yPos = doc.lastAutoTable.finalY + 15

  // === CHART CAPTURES ===
  const captureChart = async (elementId: string, title: string): Promise<void> => {
    const element = document.getElementById(elementId)
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const imgWidth = pageWidth - 2 * margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Check if we need a new page
      if (yPos + imgHeight + 15 > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }

      // Chart title
      doc.setTextColor(...textColor)
      doc.setFontSize(12)
      doc.setFont(defaultFont, 'bold')
      doc.text(title, margin, yPos)
      yPos += 5

      // Chart image
      doc.addImage(imgData, 'JPEG', margin, yPos, imgWidth, imgHeight)
      yPos += imgHeight + 10
    } catch (err) {
      console.error(`Failed to capture chart ${elementId}:`, err)
    }
  }

  // Capture available charts
  await captureChart('portfolio-growth-chart', 'Portfolio Growth Over Time')
  await captureChart('drawdown-chart', 'Historical Drawdown')
  await captureChart('beta-chart', 'Portfolio Beta Evolution')

  // === AI-READABLE DATA (New Page) ===
  doc.addPage()
  yPos = 20

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, pageWidth, 30, 'F')

  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont(defaultFont, 'bold')
  doc.text('AI Analysis Data', margin, 15)

  doc.setFontSize(8)
  doc.setTextColor(...mutedColor)
  doc.text('Structured JSON for automated analysis and AI processing', margin, 22)

  yPos = 35

  // Prepare AI-friendly data with ASCII-safe identifiers
  const aiData = results.map((r, idx) => ({
    id: `strategy_${idx + 1}`,
    name: r.strategyName,
    leveraged: r.isLeveraged,
    bankrupt: r.isBankrupt,
    metrics: {
      finalBalance: r.metrics.finalBalance,
      cagr: r.metrics.cagr,
      irr: r.metrics.irr,
      maxDrawdown: r.metrics.maxDrawdown,
      sharpeRatio: r.metrics.sharpeRatio,
      calmarRatio: r.metrics.calmarRatio,
      painIndex: r.metrics.painIndex,
      worstYearReturn: r.metrics.worstYearReturn,
      maxRecoveryMonths: r.metrics.maxRecoveryMonths,
    },
  }))

  doc.setFontSize(7)
  doc.setFont(defaultFont, 'normal')
  doc.setTextColor(71, 85, 105)

  const jsonStr = JSON.stringify(aiData, null, 2)
  const lines = doc.splitTextToSize(jsonStr, pageWidth - 2 * margin)

  lines.forEach((line: string) => {
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }
    doc.text(line, margin, yPos)
    yPos += 3.5
  })

  // === FOOTER (on last page) ===
  doc.setFontSize(7)
  doc.setTextColor(...mutedColor)
  doc.setFont(defaultFont, 'italic')
  doc.text(
    'This report is for informational purposes only and does not constitute financial advice.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' },
  )

  // Save the PDF
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`Strategy_Report_${dateStr}.pdf`)
}
