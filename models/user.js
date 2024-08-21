const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/snapshare');

const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    password: String,
    email: String,
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        }
    ]
});

module.exports = mongoose.model('User', userSchema);

