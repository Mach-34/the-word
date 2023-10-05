import mongoose from 'mongoose';

/// USERS ///

const UserSchema = new mongoose.Schema({
    pubkey: {
        type: String,
        required: true,
        unique: true
    },
    whispers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
    }],
    shouts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
    }]
});

const User = mongoose.model('User', UserSchema);

/// ROUNDS

const RoundSchema = new mongoose.Schema({
    round: {
        type: Number,
        required: true,
        unique: true
    },
    secret: {
        type: String,
    },
    commitment: {
        type: String,
        required: true,
    },
    hint: {
        type: String,
        required: true,
    },
    prize: {
        type: Number,
        default: 0,
        required: true,
    },
    whisperers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    shoutedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    active: {
        type: Boolean,
        default: true,
    }
});
const Round = mongoose.model('Round', RoundSchema);

export { User, Round };