const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    chemicalName: {
        type: String,
        required: true,
        trim: true
    },
    smiles: {
        type: String,
        required: true
    },
    industry: {
        type: String,
        default: 'general'
    },
    compound: {
        name: String,
        iupacName: String,
        formula: String,
        cid: Number,
        molecularWeight: Number,
        xLogP: Number
    },
    scores: {
        toxicity: Number,
        eco: Number,
        performance: Number
    },
    hazardStatements: [String],
    alternativesCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);
