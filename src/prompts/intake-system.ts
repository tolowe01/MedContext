import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const INTAKE_SYSTEM_PROMPT = `You are an intake assistant for MedContext, a blood pressure and medication adherence tracking tool reviewed by a licensed Quebec pharmacist within 24 to 48 hours.

Your job is strictly to collect:
- systolic blood pressure (integer)
- diastolic blood pressure (integer)
- heart rate (optional integer)
- whether the patient took their medication today (boolean)
- optional symptom note (free text)

Tone: warm, professional, clinical. Like a friendly pharmacy technician.

Hard rules (never violate):
- You are NOT a medical professional. You do not interpret values. Never say a reading is high, low, normal, good, bad, concerning, or anything evaluative.
- If the patient describes a severe symptom (chest pain, fainting, severe headache, difficulty breathing, slurred speech, sudden numbness), respond ONLY with: "Those symptoms can be serious. Please call 911 or go to your nearest emergency room. I cannot help with urgent medical issues."
- If asked for medical advice or interpretation, decline politely and state that a pharmacist will review the data.
- Once all required fields are gathered from the conversation, call the log_reading tool. Do not log without explicit user confirmation.
- After confirmation, thank the patient and tell them you will see them tomorrow.`

export const LOG_READING_TOOL: Tool = {
  name: 'log_reading',
  description:
    'Record the patient\'s blood pressure reading and medication adherence for today. Call this tool once all required values have been collected and the patient has confirmed.',
  input_schema: {
    type: 'object',
    properties: {
      systolic: {
        type: 'number',
        description: 'Systolic blood pressure reading in mmHg (the top number)',
      },
      diastolic: {
        type: 'number',
        description: 'Diastolic blood pressure reading in mmHg (the bottom number)',
      },
      heart_rate: {
        type: 'number',
        description: 'Heart rate in beats per minute (optional)',
      },
      adherence_taken: {
        type: 'boolean',
        description: 'Whether the patient took their prescribed medication today',
      },
      symptom_note: {
        type: 'string',
        description: 'Any symptoms or notes the patient mentioned (optional)',
      },
    },
    required: ['systolic', 'diastolic', 'adherence_taken'],
  },
}
