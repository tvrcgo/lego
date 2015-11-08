'use strict';

var nodemailer = require('nodemailer');
var util = require('./util');

function mail(opts) {
    if( !(this instanceof mail) ) {
        return new mail(opts);
    }

    this._transport = nodemailer.createTransport({
        service: opts.service || 'Lego',
        auth: {
            user: opts.user,
            pass: opts.pass
        }
    });
    this._opts = {};

    return this;
}

/**
 * Email body
 * @param  {[type]} html 邮件正文
 * @return {[type]}      [description]
 */
mail.prototype.body = function(html) {
    this._opts.html = html;
    return this;
}

/**
 * send mail
 * @param  {[type]}   opts { from, to, subject }
 * @param  {Function} done (error, info)
 */
mail.prototype.send = function(opts, done) {
    util.mix( this._opts, opts );
    if (this._transport) {
        this._transport.sendMail(this._opts, done);
    }
}

module.exports = mail;
