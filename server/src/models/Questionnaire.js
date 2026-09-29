import mongoose from 'mongoose';

/**
 * The questions field staff answer on a visit. There is exactly one
 * questionnaire per (year, month) and questionIds change every month, so the
 * app must never hard-code questions.
 */
const QUESTION_TYPES = ['yesNo', 'number', 'singleChoice', 'text'];

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: QUESTION_TYPES },
    text: { type: String, required: true, trim: true },

    // Present only on the types that need them. Kept as Mixed-free plain types
    // so the shape stays predictable for the app's form builder.
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    maxLength: { type: Number, default: null },
    options: { type: [String], default: undefined },

    optional: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionnaireSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, min: 2000, max: 2100 },
    month: { type: Number, required: true, min: 1, max: 12 },
    title: { type: String, required: true, trim: true },
    questions: { type: [questionSchema], required: true },
  },
  {
    timestamps: true,
    collection: 'questionnaires',
    versionKey: false,
  }
);

// One questionnaire per month. Uniqueness here is what lets the seed script be
// re-run safely, and lets GET /questionnaires/current treat the month as a key.
questionnaireSchema.index(
  { year: 1, month: 1 },
  { unique: true, name: 'year_month_unique' }
);

export { QUESTION_TYPES };
export const Questionnaire = mongoose.model('Questionnaire', questionnaireSchema);
export default Questionnaire;
