
var request = require('request');
var cheerio = require('cheerio');

var vampire = function() {
    if (!(this instanceof vampire)) {
        return new vampire;
    }
    this.rules = [];
    this.results = [];
};

vampire.prototype.src = function(url){
    var _this = this;

    fetch(url, function(err, dom, body){
        _this.$ = dom;
        _this.proc.call(_this);
    })

    return this;
};

var $;

vampire.prototype.use = function(rule){
    this.rules.push(rule);
    return this;
};

vampire.prototype.done = function(done){
    this._done = done;
};

vampire.prototype.proc = function(){
    if ( this.rules.length ) {
        $ = this.$;
        for ( var rule of this.rules ) {
            var data = proc(this.$, rule);
            this.results.push(data);
        }
    }

    if ( this._done ) {
        this._done.call(this, null, this.results);
    }
};

function fetch(url, done){
    request({
        url: url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36'
        }
    }, function(err, res, body){
        var dom = cheerio.load(body);
        done(err, dom, body);
    })
};

function proc(dom, rule){

    var match;
    if ( rule.select ) {
        if ( dom === $ ) {
            match = $(rule.select);
        }
        else {
            match = dom.find(rule.select);
        }
    }
    else {
        match = dom;
    }

    // multi selects
    if ( rule.length ) {
        var list = [];
        for (var r of rule) {
            var ret = proc(match, r);
            if (ret) list.push(ret);
        }
        return list;
    }

    // loop
    if ( rule.loop && match.length ) {
        var list = [];
        for ( var m of match.get() ) {
            var ret = proc($(m), rule.loop);
            if (ret) list.push(ret);
        }
        return list;
    }

    // loop index
    if ( rule.index && match.length ) {
        return match.map(function(idx, item){
            if ( rule.index.indexOf(idx)>=0 ) {
                return val($(item), rule);
            }
        }).get();
    }

    return val(match, rule);

}

function val(match, rule) {

    var val = {};

    // default: return text
    if ( !rule.value && !rule.attr ) {
        return match.text();
    }

    // value
    switch (rule.value) {
        case 'html':
            val[rule.value] = match.html();
            break;
        case 'text':
            val[rule.value] = match.text();
            break;
        default:
    }

    // attributes
    if ( rule.attr ) {
        if ( typeof rule.attr === 'array' ) {
            for ( var att of rule.attr ) {
                val[att] = match.attr(att);
            }
        }
        else {
            val[rule.attr] = match.attr(rule.attr);
        }
    }

    return val;
}


module.exports = vampire;
