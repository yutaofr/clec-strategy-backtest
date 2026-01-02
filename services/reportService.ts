import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { SimulationResult } from '../types'
import { zpixFont } from './fontData'

interface AIDataItem {
  id: string
  name: string
  leveraged: boolean
  bankrupt: boolean
  metrics: {
    finalBalance: number
    cagr: number
    irr: number
    maxDrawdown: number
    sharpeRatio: number
    calmarRatio: number
    painIndex: number
    worstYearReturn: number
    maxRecoveryMonths: number
  }
}

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

export const generateProfessionalReport = async (results: SimulationResult[]) => {
  const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0))

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

  await yieldToMain()

  // === EXECUTIVE SUMMARY ===
  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont(defaultFont, 'bold')
  doc.text('Executive Summary', margin, yPos)
  yPos += 8

  // Find best performers for summary - small overhead but good to yield after
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

  await yieldToMain()

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

  // Map data in chunks if large
  const tableData: (string | number)[][] = []
  const CHUNK_SIZE = 20
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE)
    chunk.forEach((r) => {
      tableData.push([
        r.strategyName,
        `$${Math.round(r.metrics.finalBalance).toLocaleString()}`,
        `${r.metrics.cagr.toFixed(2)}%`,
        `${r.metrics.irr.toFixed(2)}%`,
        `${r.metrics.maxDrawdown.toFixed(2)}%`,
        r.metrics.sharpeRatio.toFixed(2),
        r.metrics.calmarRatio.toFixed(2),
        r.metrics.painIndex.toFixed(2),
      ])
    })
    if (results.length > CHUNK_SIZE) await yieldToMain()
  }

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
  await yieldToMain()

  // === CHART CAPTURES ===
  const captureChart = async (elementId: string, title: string): Promise<void> => {
    const element = document.getElementById(elementId)
    if (!element) return

    try {
      // Yield before capture
      await yieldToMain()

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      // Yield after canvas generation
      await yieldToMain()

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
      // Yield after adding to document
      await yieldToMain()
    } catch (err) {
      console.error(`Failed to capture chart ${elementId}:`, err)
    }
  }

  // Capture available charts (already await each, yielding internally now)
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
  await yieldToMain()

  // Prepare AI-friendly data with ASCII-safe identifiers
  const aiData: AIDataItem[] = []
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE)
    chunk.forEach((r, idx) => {
      aiData.push({
        id: `strategy_${i + idx + 1}`,
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
      })
    })
    await yieldToMain()
  }

  doc.setFontSize(7)
  doc.setFont(defaultFont, 'normal')
  doc.setTextColor(71, 85, 105)

  const jsonStr = JSON.stringify(aiData, null, 2)
  // SplitTextToSize can be heavy for huge strings
  const lines = doc.splitTextToSize(jsonStr, pageWidth - 2 * margin)
  await yieldToMain()

  // Render lines in chunks
  const LINE_CHUNK = 50
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }
    doc.text(line, margin, yPos)
    yPos += 3.5

    if (i % LINE_CHUNK === 0) await yieldToMain()
  }

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

  await yieldToMain()

  // Save the PDF
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`Strategy_Report_${dateStr}.pdf`)
}
