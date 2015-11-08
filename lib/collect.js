
var request = require('request');
var cheerio = require('cheerio');

var collect = function(options) {
    if (!(this instanceof collect)) {
        return new collect(options);
    }
    this._options = options || {};
    this.tasks = [];
};

collect.prototype.src = function(url){
    var _this = this;

    fetch.call(this, url, function(err, dom, body){
        _this.$ = dom;
        filter.call(_this);
    })

    return this;
};

collect.prototype.use = function(rule, done){
    this.tasks.push([rule, done]);
    return this;
};

function fetch(url, done){

    var options =

    request({
        url: url,
        headers: {
            'User-Agent': this._options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36'
        },
        proxy: this._options.proxy || ""
    }, function(err, res, body){
        try {
            var dom = cheerio.load(body);
            done(err, dom, body);
        }
        catch(except) {
            //@TODO
            // console.log('[EXCEPT]', except);
            process.stdout.write('.');
        }
    })
}

function filter(){
    if ( this.tasks.length ) {
        for ( var task of this.tasks ) {
            var data = proc.call(this, this.$, task[0]);
            task[1] && task[1].call(this, null, data);
        }
    }
}

function proc(dom, rule){

    var _this = this;

    var match;
    if ( rule.select ) {
        if ( dom === this.$ ) {
            match = this.$(rule.select);
        }
        else {
            match = dom.find(rule.select);
        }
    }
    else {
        match = dom;
    }

    // multi selects
    if ( rule instanceof Array && rule.length ) {
        var list = [];
        for (var r of rule) {
            var ret = proc.call(this, match, r);
            if (ret) list.push(ret);
        }
        return list;
    }

    // loop
    if ( rule.loop ) {
        var list = [];
        for ( var m of match.get() ) {
            var ret = proc.call(this, this.$(m), rule.loop);
            if (ret) list.push(ret);
        }
        return list;
    }

    // loop index
    if ( rule.index ) {
        return match.map(function(idx, item){
            if ( rule.index.indexOf(idx)>=0 ) {
                return val(_this.$(item), rule);
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


module.exports = collect;
