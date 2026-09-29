import mongoose from 'mongoose';

/**
 * One school, keyed by udiseCode.
 *
 * Source fields come straight from schools.json, where real data is messy:
 * strings may be padded with whitespace and some fields are empty. Empty
 * strings are normalised to null by the import script, so here every optional
 * field is `default: null` rather than ''.
 */
const schoolSchema = new mongoose.Schema(
  {
    districtCode: { type: String, trim: true, required: true },
    districtName: { type: String, trim: true, default: null },

    blockCode: { type: String, trim: true, required: true },
    blockName: { type: String, trim: true, default: null },

    clusterCode: { type: String, trim: true, required: true },
    clusterName: { type: String, trim: true, default: null },

    // The unique identity of a school, and the upsert key used by the importer.
    udiseCode: { type: String, trim: true, required: true },

    schoolName: { type: String, trim: true, required: true },
    schoolType: { type: String, trim: true, default: null },
    management: { type: String, trim: true, default: null },
    category: { type: String, trim: true, default: null },

    classFrom: { type: String, trim: true, default: null },
    classTo: { type: String, trim: true, default: null },

    address: { type: String, trim: true, default: null },
  },
  {
    timestamps: true,
    collection: 'schools',
    versionKey: false,
  }
);

// A udiseCode may appear only once. This is what makes the import script
// idempotent: re-running it upserts instead of creating a second row.
schoolSchema.index({ udiseCode: 1 }, { unique: true, name: 'udise_unique' });

// District -> block -> cluster is how the list screen drills down, and the
// leading districtCode also drives the report's per-block grouping.
schoolSchema.index(
  { districtCode: 1, blockCode: 1, clusterCode: 1 },
  { name: 'hierarchy' }
);

export const School = mongoose.model('School', schoolSchema);
export default School;
