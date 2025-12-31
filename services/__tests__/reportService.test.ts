import { expect, it, describe, vi, beforeEach } from 'vitest'
import { generateProfessionalReport } from '../reportService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Mock dependencies
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      text: vi.fn(),
      addPage: vi.fn(),
      addImage: vi.fn(),
      save: vi.fn(),
      splitTextToSize: vi.fn().mockReturnValue(['line1', 'line2']),
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      lastAutoTable: { finalY: 100 },
    })),
  }
})

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/jpeg;base64,xxx',
    width: 100,
    height: 100,
  }),
}))

describe('reportService', () => {
  const mockResults = [
    {
      strategyName: '策略A (Strategy A)',
      isLeveraged: true,
      isBankrupt: false,
      metrics: {
        finalBalance: 1000000,
        cagr: 15.5,
        irr: 16.2,
        maxDrawdown: 10.5,
        sharpeRatio: 1.2,
        calmarRatio: 1.5,
        painIndex: 0.8,
        worstYearReturn: -5.0,
        maxRecoveryMonths: 12,
      },
      yearlyReturns: [],
      monthlyDrawdowns: [],
      leveragedStates: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock document.getElementById
    if (typeof document !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(document, 'getElementById').mockReturnValue({} as any)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(global as any).document = {
        getElementById: vi.fn().mockReturnValue({}),
      }
    }
  })

  it('should generate a professional report without errors', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await generateProfessionalReport(mockResults as any)

    // Verify jsPDF was instantiated
    expect(jsPDF).toHaveBeenCalled()

    // Verify fonts were added for both normal and bold
    const docInstance = vi.mocked(jsPDF).mock.results[0].value
    expect(docInstance.addFont).toHaveBeenCalledWith(
      expect.stringContaining('.ttf'),
      'zpix',
      'normal',
    )
    expect(docInstance.addFont).toHaveBeenCalledWith(
      expect.stringContaining('.ttf'),
      'zpix',
      'bold',
    )

    // Verify autoTable was called with correct font in columnStyles
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        columnStyles: expect.objectContaining({
          0: expect.objectContaining({ font: 'zpix' }),
        }),
      }),
    )

    // Verify save was called
    expect(docInstance.save).toHaveBeenCalled()
  })
})
