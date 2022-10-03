// load the things we need
const express = require('express');
const app = express();
const { body, validationResult } = require('express-validator');

// set the view engine to ejs
app.set('view engine', 'ejs');

// login page
app.get('/login', function(req, res) {
    res.render('pages/login');
});

// register page
app.get('/register', function(req, res) {
    res.render('pages/register');
});


// use res.render to load up an ejs view file
app.use(express.urlencoded({ extended: true })) 
app.post(
    '/register',
    body('password').isLength({ min: 7 }),
    (req, res) => {
        console.log(req.body.username);
        console.log(req.body.email);
        console.log(req.body.password);    
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
    // 今回は登録不要なのでコンソールに表示
    // User.create({
    //     username: req.body.username,
    //     email: req.body.email,
    //     password: req.body.password,
    // }).then(res.render('pages/index'));
    console.log(req.body.username);
    console.log(req.body.email);
    console.log(req.body.password);  
    res.render('pages/index')
    },
);

// home page
app.get("/", function(req, res) {
    res.render('pages/index');
})

app.listen(8080);
console.log('8080 port');
