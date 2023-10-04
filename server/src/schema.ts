import mongoose from 'mongoose';

/// USERS ///



const UserModel = mongoose.model('User', UserSchema);

/// ROUNDS

const RoundSchema = new mongoose.Schema({
    round: {
        type: Number,
        required: true,
        unique: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hint: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true,
    },
    created: {
        type: Date,
        default: Date.now,
        required: true
    },
    ended: {
        type: Date,
        required: false
    },
    whipsers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        required: false
    },
    shoutedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
});
const RoundModel = mongoose.model('Round', RoundSchema);

export { UserModel, RoundModel };