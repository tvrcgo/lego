# lego
乐高嘛
```js
var lego = require('lego');
```

## vampire
通过写规则处理数据，不需要每个内容源写一堆不能复用的代码，把重心放在数据后处理的过程。

这个版本简化了公共方法。只有两个
- `src` 取源内容
- `use` 指定数据处理规则和后处理逻辑

### Example
```js
var vampire = lego.vampire;
vampire()
    .src('http://movie.douban.com/later/guangzhou')
    .use({
        select: '#showing-soon .item',
        loop: [
            {
                select: 'h3 a',
                value: 'text',
                attr: 'href'
            },
            {
                select: '.thumb img',
                attr: 'src'
            }
        ]
    }, function(err, result){
        result.forEach(function(item){
            console.log(item)
        })
    })
```


## License
MIT
