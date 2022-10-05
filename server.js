// load the things we need
const express = require('express');
const app = express();
const { check, validationResult } = require('express-validator');

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
    [
        check('username').not().isEmpty().withMessage('usernameが空です。'),
        check('email').not().isEmpty().withMessage('emailが空です。'),
        check('password').not().isEmpty().withMessage('passwordが空です。'),
        check('password').isLength({ min: 7 }).withMessage('passwordは７文字以上必要です。'),
        check('password').custom((value, { req }) => {
            if (value === req.body.confirmPassword) {
                return true;
            }
        }).withMessage('passwordとconfirmPasswordが一致しません。'),
    ],
    function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            let messages = [];
            errors.errors.forEach((error) => {
                messages.push(error.msg);
            });
            console.log(messages);
            res.render('pages/register');
        } else { 
            res.render('pages/index');        
        }
    }
    // 今回は登録不要なのでコンソールに表示
    // User.create({
    //     username: req.body.username,
    //     email: req.body.email,
    //     password: req.body.password,
    // }).then(res.render('pages/index'));
);

// home page
app.get("/", function(req, res) {
    res.render('pages/index');
})

app.listen(8080);
console.log('8080 port');
