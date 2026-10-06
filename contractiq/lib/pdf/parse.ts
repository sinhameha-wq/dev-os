import pdfParse from 'pdf-parse'

export interface ExtractedPDF {
  text: string
  pageCount: number
  wordCount: number
}

interface PdfPageData {
  getTextContent: (opts: {
    normalizeWhitespace: boolean
    disableCombineTextItems: boolean
  }) => Promise<{ items: Array<{ str: string }> }>
}

export async function extractTextWithPageMarkers(buffer: Buffer): Promise<ExtractedPDF> {
  const pages: string[] = []

  const renderPage = async (pageData: PdfPageData): Promise<string> => {
    const content = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    })
    const text = content.items.map((item) => item.str).join(' ')
    pages.push(text)
    return text
  }

  const data = await pdfParse(buffer, { pagerender: renderPage })

  const fullText =
    pages.length > 0
      ? pages.map((p, i) => `[PAGE ${i + 1}]\n${p.trim()}`).join('\n\n')
      : data.text

  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length

  return {
    text: fullText.trim(),
    pageCount: data.numpages,
    wordCount,
  }
}
