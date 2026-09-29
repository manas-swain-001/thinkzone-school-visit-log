import mongoose from 'mongoose';

/** The three demo users. There is no login; the app stores the chosen userId. */
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true, uppercase: true },
    userName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    collection: 'users',
    versionKey: false,
  }
);

// userId is the value the app sends on every request, and it is how a user's
// visits are listed, so it must be unique and directly addressable.
userSchema.index({ userId: 1 }, { unique: true, name: 'userId_unique' });

export const User = mongoose.model('User', userSchema);
export default User;
