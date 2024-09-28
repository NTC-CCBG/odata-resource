const { check, validationResult } = require('express-validator');

const userValidators = () =>  [
    check('email')
        .trim()
        .isEmail().withMessage('Invalid email address.').bail(),   
    check('password')
        .trim()
        .isMD5().withMessage('Invalid password format.').bail()
];

const reporter = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({ message: errors.errors[0].msg });
    }
    next();
}

module.exports = {
    user: [
        userValidators(),
        reporter
    ]
};
