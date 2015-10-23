# lego
乐高嘛
```js
var lego = require('lego');
```

## collect
通过写规则处理数据，不需要每个内容源写一堆不能复用的代码，把重心放在数据后处理的过程。

这个版本简化了公共方法。只有两个
- `src` 取源内容
- `use` 指定数据处理规则和后处理逻辑

一个规则包含四个属性：
- `select` 元素选择器
- `value` 内容，默认是 text
- `attr` 属性值
- `loop` 循环

loop 下可以嵌套规则：
```js
{
    select: '',
    loop: {
        select: '',
        value: '',
        attr: ''
    },
    value: '',
    attr: ''
}
```

### Example
```js
var collect = lego.collect;
collect()
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
