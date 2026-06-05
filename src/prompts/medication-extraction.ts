import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const MEDICATION_EXTRACTION_SYSTEM_PROMPT = `You are a careful medication extraction assistant for MedContext, a pharmacist tool. You read a single uploaded document (an electronic medication list, a printed prescription summary, or a pharmacy printout) and return the patient's current active medications as structured data.

Hard rules (never violate):
- Extract ONLY medications the patient is currently taking. Do not include medications that have been discontinued, stopped, on hold, or crossed out.
- Never invent, guess, or infer a medication, dose, frequency, or prescriber that is not written in the document. If a value is not present, return an empty string for that field.
- If a medication shows a titration history (several dose changes over time for the same drug), output only the single current or most recent entry for that drug, not the historical doses.
- Preserve dose values and their units exactly as written, verbatim (for example "12.5 mg", "5 mg", "10 units"). Do not convert, round, or normalize units.
- Capture the prescribing physician's name verbatim if it is shown, otherwise return an empty string. Do not assign a prescriber to a medication unless the document attributes one.
- Documents may be written in English or in French. Read both. Do not translate medication names.
- For any missing field, return an empty string. Never use null, "N/A", "unknown", or placeholder text.
- If the document is unreadable, is an image with no extractable text, or contains no medications, return an empty medications array. Do not fabricate rows to fill it.

Uncertainty handling:
- When a row is illegible, partially cut off, or relies on imperfect OCR, still extract your best reading of the clearly visible fields and record the caveat in that row's notes field (for example "frequency illegible" or "OCR uncertain on dose").
- When two rows may be duplicates of the same drug, keep the current entry and note the ambiguity in its notes field.
- Keep notes short, factual, and specific to that row. Do not put general commentary about the whole document in notes.

Always respond by calling the extract_medications tool with the structured result. Do not write prose outside the tool call.`

export const EXTRACT_MEDICATIONS_TOOL: Tool = {
  name: 'extract_medications',
  description:
    'Return the patient\'s current active medications extracted from the uploaded document. Use empty strings for fields that are not present, and return an empty medications array when the document has no readable medications.',
  input_schema: {
    type: 'object',
    properties: {
      medications: {
        type: 'array',
        description:
          'The current active medications. Empty array when none can be read from the document.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Medication name as written. Empty string if not present.',
            },
            dose: {
              type: 'string',
              description:
                'Dose with units, verbatim (for example "12.5 mg"). Empty string if not present.',
            },
            frequency: {
              type: 'string',
              description:
                'How often the medication is taken (for example "once daily"). Empty string if not present.',
            },
            prescribing_physician_name: {
              type: 'string',
              description:
                'Prescribing physician name, verbatim. Empty string if not attributed in the document.',
            },
            notes: {
              type: 'string',
              description:
                'Per-row caveats such as illegibility, OCR uncertainty, or a possible duplicate. Empty string when there is nothing to note.',
            },
          },
          required: ['name', 'dose', 'frequency', 'prescribing_physician_name', 'notes'],
        },
      },
    },
    required: ['medications'],
  },
}
