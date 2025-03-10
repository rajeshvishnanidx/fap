const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();
const PDFParser = require('pdf2json');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

class DocumentProcessor {
  static async processFile(filePath, mimeType) {
    try {
      console.log('Processing file:', filePath, 'with mime type:', mimeType);
      
      // Check if file exists and get absolute path
      const absolutePath = path.resolve(filePath);
      await fs.access(absolutePath);
      console.log('File exists at:', absolutePath);
      
      switch (mimeType) {
        case 'application/pdf':
          return await DocumentProcessor.processPDF(absolutePath);
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await DocumentProcessor.processWord(absolutePath);
        case 'text/plain':
          return await DocumentProcessor.processText(absolutePath);
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('File processing error:', error);
      if (error.code === 'ENOENT') {
        throw new Error(`File not found at path: ${filePath}`);
      }
      throw new Error(`Error processing file: ${error.message}`);
    }
  }

  static async processPDF(filePath) {
    console.log('Starting PDF processing for:', filePath);
    
    try {
      // Verify file exists and is readable
      const stats = await fs.stat(filePath);
      console.log('File size:', stats.size, 'bytes');
      
      if (stats.size === 0) {
        throw new Error('PDF file is empty');
      }

      // Try pdf-parse first as it's more reliable
      try {
        console.log('Attempting to process PDF with pdf-parse');
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer, {
          max: 0,
          version: 'v2.0.550',
          // Ignore TT font warnings
          suppressConsoleLogging: true
        });
        
        if (!data || !data.text || data.text.trim().length === 0) {
          throw new Error('No text content found in PDF');
        }

        const text = data.text
          .replace(/\r\n/g, '\n')
          .replace(/[^\S\n]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (text.length > 0) {
          console.log('Successfully extracted text with pdf-parse, length:', text.length);
          return text;
        }
        throw new Error('Extracted text is empty');
      } catch (pdfParseError) {
        // Only log the error if it's not a TT font warning
        if (!pdfParseError.message.includes('TT')) {
          console.error('pdf-parse failed:', pdfParseError);
        }
        
        // Try pdf.js-extract
        try {
          console.log('Attempting to process PDF with pdf.js-extract');
          const data = await pdfExtract.extract(filePath, {});
          
          if (!data || !data.pages || data.pages.length === 0) {
            throw new Error('No content found in PDF');
          }

          const text = data.pages
            .map(page => page.content
              .map(item => item.str)
              .join(' '))
            .join('\n\n')
            .replace(/\r\n/g, '\n')
            .replace(/[^\S\n]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.trim().length === 0) {
            throw new Error('No text content found in PDF');
          }

          console.log('Successfully extracted text with pdf.js-extract, length:', text.length);
          return text;
        } catch (pdfJsError) {
          console.error('pdf.js-extract failed:', pdfJsError);
          
          // Try pdf2json as last resort
          console.log('Attempting to process PDF with pdf2json');
          const pdfParser = new PDFParser(null, 1);
          
          const pdfData = await new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataReady', (pdfData) => {
              resolve(pdfData);
            });
            
            pdfParser.on('pdfParser_dataError', (errData) => {
              reject(new Error(`PDF parsing error: ${errData.parserError}`));
            });

            pdfParser.on('error', (err) => {
              reject(new Error(`PDF parsing error: ${err.message}`));
            });

            try {
              pdfParser.loadPDF(filePath);
            } catch (err) {
              reject(new Error(`Failed to load PDF: ${err.message}`));
            }
          });

          if (!pdfData || !pdfData.Pages || pdfData.Pages.length === 0) {
            throw new Error('No content found in PDF');
          }

          let text = '';
          for (const page of pdfData.Pages) {
            if (page.Texts && page.Texts.length > 0) {
              for (const textItem of page.Texts) {
                if (textItem.R && textItem.R.length > 0) {
                  text += decodeURIComponent(textItem.R[0].T) + ' ';
                }
              }
              text += '\n\n';
            }
          }

          text = text
            .replace(/\\n/g, '\n')
            .replace(/[^\S\n]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.trim().length === 0) {
            throw new Error('No text content found in PDF');
          }

          console.log('Successfully extracted text with pdf2json, length:', text.length);
          return text;
        }
      }
    } catch (error) {
      // If we have successfully extracted text but got a TT font warning, ignore the error
      if (error.message.includes('TT') && error.text && error.text.length > 0) {
        return error.text;
      }

      console.error('PDF Processing Error:', error);
      const errorMessage = `Error processing PDF: ${error.message}. Please ensure the PDF contains extractable text and is not corrupted. If the issue persists, try converting the PDF to a different format using Adobe Acrobat or a similar tool.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  static async processWord(filePath) {
    console.log('Starting Word processing for:', filePath);
    
    try {
      // Try docxtemplater first for DOCX files
      try {
        console.log('Attempting to process with docxtemplater');
        const content = await fs.readFile(filePath);
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);
        const text = doc.getFullText();

        if (!text || text.trim().length === 0) {
          throw new Error('No text content found');
        }

        return text
          .replace(/\r\n/g, '\n')
          .replace(/[^\S\n]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      } catch (docxError) {
        console.log('docxtemplater failed, trying mammoth:', docxError);
        
        // Fallback to mammoth
        const result = await mammoth.extractRawText({ 
          path: filePath,
          convertImage: mammoth.images.imgElement(function(image) {
            return image.read().then(function(imageBuffer) {
              return { src: '' };
            });
          })
        });

        if (!result || !result.value || result.value.trim().length === 0) {
          throw new Error('No text content found in Word document');
        }

        return result.value
          .replace(/\r\n/g, '\n')
          .replace(/[^\S\n]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    } catch (error) {
      console.error('Word Processing Error:', error);
      throw new Error(`Error processing Word document: ${error.message}. Please ensure the file is not corrupted and is in a supported format.`);
    }
  }

  static async processText(filePath) {
    console.log('Starting text file processing for:', filePath);
    
    try {
      const text = await fs.readFile(filePath, 'utf8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text file is empty');
      }

      return text
        .replace(/\r\n/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch (error) {
      console.error('Text Processing Error:', error);
      throw new Error(`Error processing text file: ${error.message}. Please ensure the file is a valid text file with UTF-8 encoding.`);
    }
  }

  static async splitIntoChunks(text, maxChunkSize = 6000) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
      }

      // Split text into sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      
      if (sentences.length === 0) {
        // If no sentences found, split by newlines or spaces
        sentences.push(...text.split(/[\n\s]+/));
      }

      const chunks = [];
      let currentChunk = '';

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        // If a single sentence is longer than maxChunkSize, split it
        if (trimmedSentence.length > maxChunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
          
          // Split long sentence into smaller parts
          let i = 0;
          while (i < trimmedSentence.length) {
            chunks.push(trimmedSentence.slice(i, i + maxChunkSize).trim());
            i += maxChunkSize;
          }
          continue;
        }

        // If adding this sentence would exceed the chunk size, start a new chunk
        if ((currentChunk + trimmedSentence).length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        currentChunk += trimmedSentence + ' ';
      }

      // Add the last chunk if it's not empty
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }

      // Ensure we have at least one chunk
      if (chunks.length === 0 && text.trim().length > 0) {
        chunks.push(text.trim());
      }

      return chunks;
    } catch (error) {
      console.error('Chunk Processing Error:', error);
      throw new Error(`Error splitting text into chunks: ${error.message}`);
    }
  }
}

module.exports = DocumentProcessor; 