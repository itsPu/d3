require('../css-module/relsMap-tooltip.less');
const d3 = require('d3');
const $ = require('jquery');

/**
 * 关系力导向图 - d3.js制作   （pc,wap通用）
 * @param id    {string} 父容器id
 * @param configPar      {JSON对象}    配置
 */
function MakeSvgPicClass(id, configPar) {
    this.config = {
        width: 375, // 总画布svg的宽
        height: 610,
        nodes: [],
        links: [],
        isHighLight: false ,    //是否启动 鼠标 hover 到节点上高亮与节点有关的节点，其他无关节点透明的功能
        isScale: true,      //是否启用缩放平移zoom功能
        scaleExtent: [0.5, 1.5],  //缩放的比例尺
        chargeStrength:-300,    //万有引力
        collide:60,        //碰撞力的大小 （节点之间的间距）
        nodeWidth: 120,     // 每个node节点所占的宽度，正方形
        margin: 20,     // node节点距离父亲div的margin
        alphaDecay:0.0228,  //控制力学模拟衰减率
        r: 30,      // 头像的半径 [30 - 45]
        relFontSize: 12 ,   //关系文字字体大小
        linkSrc: 30, // 划线时候的弧度
        linkColor:'#bad4ed',    //链接线默认的颜色
        strokeColor: '#7ecef4', // 头像外围包裹的颜色
        strokeWidth: 3, // 头像外围包裹的宽度
    };

    this.R = 30;  //画线时候的影响弧度
    $.extend(true, this.config, configPar);
    var _that = this;
    var timeout;//定时器

    
    // 1. 创建一个力学模拟器
    this.simulation = d3.forceSimulation(this.config.nodes)
    // simulation.force(name,[force])函数，添加某种力
        .force("link", d3.forceLink(this.config.links))
        // 万有引力
        .force("charge", d3.forceManyBody().strength(this.config.chargeStrength))
        // d3.forceCenter()用指定的x坐标和y坐标创建一个新的居中力。
        .force("center", d3.forceCenter(this.config.width / 2, this.config.height / 2))
        // 碰撞作用力，为节点指定一个radius区域来防止节点重叠，设置碰撞力的强度，范围[0,1], 默认为0.7。设置迭代次数，默认为1，迭代次数越多最终的布局效果越好，但是计算复杂度更高
        .force("collide", d3.forceCollide(this.config.collide).strength(0.2).iterations(5))
        // 在计时器的每一帧中，仿真的alpha系数会不断削减,当alpha到达一个系数时，仿真将会停止，也就是alpha的目标系数alphaTarget，该值区间为[0,1]. 默认为0，
        // 控制力学模拟衰减率，[0-1] ,设为0则不停止 ， 默认0.0228，直到0.001
        .alphaDecay(this.config.alphaDecay)
        // 监听事件 ，tick|end ，例如监听 tick 滴答事件
        .on("tick", ()=>this.ticked());


    // 2.创建svg标签
    this.SVG = d3.select("#" + id).append("svg")
        .attr("class", "svgclass")
        .attr("width", this.config.width)
        .attr("height", this.config.height)
        // .transition().duration(750).call(d3.zoom().transform, d3.zoomIdentity);
        .call( d3.zoom().scaleExtent(this.config.scaleExtent).on("zoom", ()=> {
            if(this.config.isScale){
                _that.relMap_g.attr("transform", d3.event.transform);
            }
        }))
        .on('click',()=>$('.tooltip').remove())
        .on("dblclick.zoom", null);


    // 3.defs  <defs>标签的内容不会显示，只有调用的时候才显示
    this.defs=this.SVG.append('defs');
     // 3.1 添加箭头
    this.marker=this.defs
        .append("marker")
        .attr('id', "marker")
        .attr("markerWidth", 10)    //marker视窗的宽
        .attr("markerHeight", 10)   //marker视窗的高
        .attr("refX", this.config.r + 3*this.config.strokeWidth)            //refX和refY，指的是图形元素和marker连接的位置坐标
        .attr("refY", 4)
        .attr("orient", "auto")     //orient="auto"设置箭头的方向为自动适应线条的方向
        .attr("markerUnits", "userSpaceOnUse")  //marker是否进行缩放 ,默认值是strokeWidth,会缩放
        .append("path")
        .attr("d", "M 0 0 8 4 0 8Z")    //箭头的路径 从 （0,0） 到 （8,4） 到（0,8）
        .attr("fill", "steelblue");

    // 3.2 添加多个头像图片的 <pattern>
    this.patterns = this.defs
        .selectAll("pattern.patternclass")
        .data(this.config.nodes)
        .enter()
        .append("pattern")
        .attr("class", "patternclass")
        .attr("id", function (d, index) {
            return 'avatar' + id + d.id;
        })
        // 两个取值userSpaceOnUse  objectBoundingBox
        .attr('patternUnits', 'objectBoundingBox')
        // <pattern>，x、y值的改变决定图案的位置，宽度、高度默认为pattern图案占填充图形的百分比。
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", "1")
        .attr("height", "1");

    // 3.3 向<defs> - <pattern>添加 头像
    this.patterns.append("image")
        .attr("class", "circle")
        .attr("xlink:href", function (d) {
            return d.avatar || "https://static.linkeddb.com/m/images/none.jpg"; // 修改节点头像
        })
        .attr("src", function (d) {
            return d.avatar || "https://static.linkeddb.com/m/images/none.jpg"; // 修改节点头像
        })
        .attr("height", this.config.r*2)
        .attr("width", this.config.r*2)
        .attr("preserveAspectRatio", "xMidYMin slice");

    // 3.4 名字
    this.patterns.append("rect").attr("x", "0").attr("y", 4/3*this.config.r).attr("width", 2*this.config.r).attr("height", 2/3*this.config.r).attr("fill", "black").attr("opacity", "0.5");
    this.patterns.append("text").attr("class", "nodetext")
        .attr("x", this.config.r).attr("y", (5/3*this.config.r))
        .attr('text-anchor', 'middle')
        .attr("fill", "#fff")
        .style("font-size", this.config.r/3)
        .text(function (d) {
            return d.name;
        });

    

    // 4.放关系图的容器
    this.relMap_g = this.SVG.append("g")
        .attr("class", "relMap_g")
        .attr("width", this.config.width)
        .attr("height", this.config.height);


    // 5.关系图添加线
    // 5.1  每条线是个容器，有线 和一个装文字的容器
    this.edges = this.relMap_g
    .selectAll("g.edge")
    .data(this.config.links)
    .enter()
    .append("g")
    .attr("class","edge")
    .on('mouseover', function () {
        d3.select(this).selectAll('path.links').attr('stroke-width', 4);
    })
    .on('mouseout', function () {
        d3.select(this).selectAll('path.links').attr('stroke-width', 1);
    })
    .on('click',function (d) {
        // $('.no-more').removeClass('hide').addClass('prompt');
        // if(timeout){
        //     clearTimeout(timeout);
        // }
        // console.log(d);
        // $('.no-more').html(`<a class="external" data-no-cache="true" href="${d.source.url}">${d.source.name}</a>&nbsp;  ${d.type} &nbsp;<a class="external" data-no-cache="true" href="${d.target.url}">${d.target.name}</a> `);
        // timeout=setTimeout(()=>$('.no-more').addClass('hide'),3000);
        
        // 浮窗展示
        event = d3.event || window.event;
        var pageX = event.pageX ? event.pageX : (event.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft));
        var pageY = event.pageY ? event.pageY : (event.clientY + (document.body.scrollTop || document.documentElement.scrollTop));
        // console.log('pagex',pageX);
        // console.log('pageY',pageY);
        //阻止事件冒泡  阻止事件默认行为
        event.stopPropagation ? (event.stopPropagation()) :  (event.cancelBubble = true);
        event.preventDefault ? (event.preventDefault()) : (event.returnValue = false);

        var _html=`<a class="external linkname" data-no-cache="true"  href="${d.source.url}" >${d.source.name} </a>`;
        
        _html+=` &gt; <a class="external linkname" data-no-cache="true"  href="${d.target.url}" >${d.target.name}</a> : ${d.type}`;

        d3.selectAll('.tooltip').remove();
        var _div=d3.select('#'+id).append('div')
                .attr('class','tooltip')
                .html(_html);

        var _width=parseInt(_div.style('width'));
        console.log('width',_width);

        //判断浮窗的左上角坐标 ，如果太靠右侧/底部 边缘 ，浮窗位置平移
        console.log('dw'+document.body.clientWidth);
        if(document.body.clientWidth - pageX < _width){
            pageX=document.body.clientWidth - _width -5;
        }
        if(document.body.clientHeight - pageY < 50){
            pageY=document.body.clientHeight-50;
        }

        _div.style('top',pageY+'px')
        .style('left',pageX+'px');
    })
    .attr('fill', function (d) {
        var str = '#bad4ed';
        if (d.color) {
            str = "#" + d.color;
        }
        return str;
    })

    // 5.2 添加线
    this.links=this.edges.append("path").attr("class","links")
    .attr("d", d=> {return "M" + this.R + "," + 0 + " L" + getDis(d.source, d.target) + ",0";})
    .style("marker-end", "url(#marker)")
    // .attr("refX",this.config.r)
    .attr('stroke', (d)=> {
        var str=d.color ? "#"+d.color : this.config.linkColor ;
        return str;
    });

    // 5.3 添加关系文字的容器
    this.rect_g=this.edges.append("g").attr("class", "rect_g");

   // 5.4 添加rect
    this.rects =this.rect_g.append("rect")
    .attr("x", 40)
    .attr("y", -10)
    .attr("width", 40)
    .attr("height", 20)
    .attr("fill", "white")
    .attr('stroke',  (d)=> {
        var str=d.color ? "#"+d.color : this.config.linkColor ;
        return str;
    })

    // 5.5 文本标签  坐标（x,y）代表 文本的左下角的点
    this.texts = this.rect_g.append("text")
    .attr("x", 40)
    .attr("y", 5)
    .attr("text-anchor", "middle")  // <text>文本中轴对齐方式居中  start | middle | end
    .style("font-size",12).text(d=>{return d.type});


    // 6.关系图添加用于显示头像的节点
        this.circles =  this.relMap_g.selectAll("circle.circleclass")
            .data(this.config.nodes)
            .enter()
            .append("circle")
            .attr("class","circleclass")
            .style("cursor", "pointer")
            // .attr("cx", function (d) {
            //     return d.x;
            // })
            // .attr("cy", function (d) {
            //     return d.y;
            // })
            .attr("fill", function (d) {
                return ("url(#avatar" + id + d.id + ")");
            })
            .attr("stroke", "#ccf1fc")
            .attr("stroke-width", this.config.strokeWidth)
            .attr("r", this.config.r)
            .on('mouseover', function(d){
                d3.select(this).attr('stroke-width', '8');
                d3.select(this).attr('stroke', '#a3e5f9');
                if(_that.config.isHighLight){
                    _that.highlightObject(d);
                }
            })
            .on('mouseout', function(d){
                d3.select(this).attr('stroke-width', _that.config.strokeWidth);
                d3.select(this).attr('stroke', '#c5dbf0');
                if(_that.config.isHighLight){
                    _that.highlightObject(null);
                }
            })
            .on('click', function (d) {

                // // 展示方式1 ：屏幕下方bar
                // $('.no-more').removeClass('hide');
                // if(timeout){
                //     clearTimeout(timeout);
                // }
                // if(d.exdata){
                //     $('.no-more').html(`<a class="external" data-no-cache="true" href="/person/${d.exdata.oid}">${d.exdata.name}</a>&nbsp; 饰 &nbsp;<a class="external" data-no-cache="true" href="${d.url}">${d.name}</a> `);
                // }else {
                //     $('.no-more').html(`<a href="${d.url}">${d.name}</a>`);
                // }
                // timeout=setTimeout(()=>$('.no-more').addClass('hide'),3000);

                // 展示方式2 ：浮窗展示
                event = d3.event || window.event;
                var pageX = event.pageX ? event.pageX : (event.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft));
                var pageY = event.pageY ? event.pageY : (event.clientY + (document.body.scrollTop || document.documentElement.scrollTop));
                // console.log('pagex',pageX);
                // console.log('pageY',pageY);
                //阻止事件冒泡  阻止事件默认行为
                event.stopPropagation ? (event.stopPropagation()) :  (event.cancelBubble = true);
                event.preventDefault ? (event.preventDefault()) : (event.returnValue = false);

                var _html=`<a href="${d.url}" class="external linkname" data-no-cache="true">${d.name}</a>`;
                if(d.exdata){
                    _html+=`&nbsp;&nbsp;(<a class="external linkname" data-no-cache="true" href="${d.exdata.url}" >${d.exdata.name}</a> 饰)`;
                }


                d3.selectAll('.tooltip').remove();
                var _div=d3.select('#'+id).append('div')
                        .attr('class','tooltip')
                        .html(_html);

                var _width=parseInt(_div.style('width'));
                console.log('width',_width);

                //判断浮窗的左上角坐标 ，如果太靠右侧/底部 边缘 ，浮窗位置平移
                console.log('dw'+document.body.clientWidth);
                if(document.body.clientWidth - pageX < _width){
                    pageX=document.body.clientWidth - _width -5;
                }
                if(document.body.clientHeight - pageY < 50){
                    pageY=document.body.clientHeight-50;
                }

                _div.style('top',pageY+'px')
                    .style('left',pageX+'px');
                
            })
            .on('mousedown', function (d) {     //监听鼠标落下
                // console.log(event);
                // console.log(window.event);
                // event = event || window.event;
                // var btnNum = event.button;
                // if (btnNum == 2) {
                //     console.log("您点击了鼠标右键！");
                // }

                // if (window.Event)
                //     document.captureEvents(Event.MOUSEUP);
                // var canClick=false;
                // function nocontextmenu()
                // {
                //     if(canClick)return;
                //     event.cancelBubble = true
                //     event.returnValue = false;
                //     canClick=true;
                //     return false;
                // }
                // function norightclick(e)
                // {
                //     if (window.Event)
                //     {
                //         if (e.which == 2 || e.which == 3)
                //             return false;
                //     }
                //     else if (event.button == 2 || event.button == 3)
                //     {
                //         event.cancelBubble = true;
                //         event.returnValue = false;
                //         return false;
                //     }
                // }
                // document.oncontextmenu = nocontextmenu;  // for IE5+
                // document.onmousedown = norightclick;  // for all others
            })
            .on('contextmenu', function () {    //鼠标右键菜单
                // event = event || window.event;
                // event.cancelBubble = true;
                // event.returnValue = false;
                // var pageX = event.pageX ? event.pageX : (event.clientX + (document.body.scrollLeft || document.documentElement.scrollLeft));
                // var pageY = event.pageY ? event.pageY : (event.clientY + (document.body.scrollTop || document.documentElement.scrollTop));
                // $('#myContextMenu').css('left', pageX);
                // $('#myContextMenu').css('top', pageY);
                // $('#myContextMenu').css('visibility ', 'visible');
                // $('#myContextMenu').show();
                // return false;
            })
            // 应用 自定义的 拖拽事件
            .call(d3.drag()
            .on('start', function (d) {
                d3.event.sourceEvent.stopPropagation();
                // restart()方法重新启动模拟器的内部计时器并返回模拟器。
                // 与simulation.alphaTarget或simulation.alpha一起使用时，此方法可用于在交互
                // 过程中进行“重新加热”模拟，例如在拖动节点时，在simulation.stop暂停之后恢复模拟。
                // 当前alpha值为0，需设置alphaTarget让节点动起来
                if (!d3.event.active) _that.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', function (d) {
    
                // d.fx属性- 节点的固定x位置
                // 在每次tick结束时，d.x被重置为d.fx ，并将节点 d.vx设置为零
                // 要取消节点，请将节点 .fx和节点 .fy设置为空，或删除这些属性。
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            })
            .on('end', function (d) {
    
                // 让alpha目标值值恢复为默认值0,停止力模型
                if (!d3.event.active) _that.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));




    

    // 7.动态改变 线和节点的 位置
    // tick心跳函数
    this.ticked = ()=>{

        // 7.1 修改每条容器edge的位置
        this.edges.attr("transform", function (d) {
            return getTransform(d.source, d.target, getDis(d.source, d.target))
        });

        // 7.2 修改每条线link位置
        this.links.attr("d", d=> {return "M" + this.R + "," + 0 + " L" + getDis(d.source, d.target) + ",0";})
    
        
        // 7.3 修改线中关系文字text的位置 及 文字的反正
        this.texts
        .attr("x", function(d){
            // 7.3.1 根据字的长度来更新兄弟元素 rect 的宽度
            var bbox=d3.select(this).node().getBBox();
            var width = bbox.width;
            $(this).prev('rect').attr('width',width+10);   
            // 7.3.2 更新 text 的位置
            return getDis(d.source, d.target) / 2})
        .attr("transform", function (d) {
            // 7.3.3 更新文本反正
            if (d.target.x < d.source.x) {
                var x = getDis(d.source, d.target) / 2;
                return 'rotate(180 ' + x + ' ' + 0 + ')';
            } else {
                return 'rotate(0)';
            }
        });

        // 7.4 修改线中装文本矩形rect的位置
        this.rects 
        .attr("x", function(d){return getDis(d.source, d.target) / 2  - $(this).attr('width')/2})    // x 坐标为两点中心距离减去自身长度一半

        // 5.修改节点的位置
        this.circles
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })



    };




















    /**
     *  关于缩放平移踩的大坑
     *  1. 改变需要缩放平移对象的transform来实现 ，本例子是 this.relMap_g
     *  2. 但是zoom 事件的监听应该放到整个的svg上 ,本例子是 this.SVG
     *  3. 这样 监听出来的 d3.event.transform 的 transform 数值才是正确的
     *  4. 直接把zoom 事件监听 this.relMap_g 得到的 transform 数值会爆炸大，移动非常不平顺，瞬移消失在视野
     *
     *  d3.event.transform{
     *      k:1    // 当前比例尺
     *      x:0    // x 方向移动的大小
     *      y:0    // y 方向移动的大小
     *  }
     * */
    this.zoom = d3.zoom()
        .scaleExtent(this.config.scaleExtent)
        .on("zoom", ()=> {
            if(this.config.isScale){
                _that.relMap_g.attr("transform", d3.event.transform);
            }
        });


    /**
     * d3 拖拽事件drag event 参数
     *   target- 相关的拖动行为。
     *   type - 字符串“start”, “drag” or “end”;  请参阅drag .on。
     *   subject- 拖动主题，由drag .subject定义。
     *   x- 主题的新x坐标; 请参阅drag .container。
     *   y- 主题的新y坐标; 请参阅drag .container。
     *   dx- 自上次拖动事件以来x坐标的变化。
     *   dy- 自上次拖动事件以来y坐标的变化。
     *   identifier- 字符串“鼠标”或数字触摸标识符。
     *   active - 当前活动拖动手势的数量（在开始和结束时，不包括这一个）。
     *   sourceEvent - 基础输入事件，如mousemove或touchmove。
     * */
    // d3.drag() 创建一个新的拖动行为。返回的行为拖动既是对象又是函数，通常通过选择 .call应用于选定的元素。
    // start - 新指针变为活动状态后（在mousedown或touchstart上）
    // drag - 活动指针移动后（在mousemove或touchmove上）。
    // end - 活动指针变为非活动状态后（在mouseup，touchend或touchcancel上）。
    this.drag =()=>{ 
        return d3.drag()
        .on('start', function (d) {
            d3.event.sourceEvent.stopPropagation();
            // restart()方法重新启动模拟器的内部计时器并返回模拟器。
            // 与simulation.alphaTarget或simulation.alpha一起使用时，此方法可用于在交互
            // 过程中进行“重新加热”模拟，例如在拖动节点时，在simulation.stop暂停之后恢复模拟。
            // 当前alpha值为0，需设置alphaTarget让节点动起来
            if (!d3.event.active) _that.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', function (d) {

            // d.fx属性- 节点的固定x位置
            // 在每次tick结束时，d.x被重置为d.fx ，并将节点 d.vx设置为零
            // 要取消节点，请将节点 .fx和节点 .fy设置为空，或删除这些属性。
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        })
        .on('end', function (d) {

            // 让alpha目标值值恢复为默认值0,停止力模型
            if (!d3.event.active) _that.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
    }

    /*
     * 高亮和取消高亮
     * */
    this.highlighted = null;
    this.dependsNode = [];
    this.dependsLinkAndText = [];
    this.highlightObject = function (obj) {
        if (obj) {
            var objIndex = obj.index;
            _that.dependsNode = _that.dependsNode.concat([objIndex]);
            _that.dependsLinkAndText = _that.dependsLinkAndText.concat([objIndex]);
            _that.config.links.forEach(function (lkItem) {
                if (objIndex == lkItem['source']['index']) {
                    _that.dependsNode = _that.dependsNode.concat([lkItem.target.index]);
                } else if (objIndex == lkItem['target']['index']) {
                    _that.dependsNode = _that.dependsNode.concat([lkItem.source.index]);
                }
            });

            // 隐藏节点
            _that.SVG.selectAll('circle').filter(function (d) {
                return (_that.dependsNode.indexOf(d.index) == -1);
            }).transition().style('opacity', 0.1);
            // 隐藏线
            _that.SVG.selectAll('.edge').filter(function (d) {
                // return true;
                return ((_that.dependsLinkAndText.indexOf(d.source.index) == -1) && (_that.dependsLinkAndText.indexOf(d.target.index) == -1))
            }).transition().style('opacity', 0.1);

        } else {
            // 取消高亮
            // 恢复隐藏的线
            _that.SVG.selectAll('circle').filter(function () {
                return true;
            }).transition().style('opacity', 1);
            // 恢复隐藏的线
            _that.SVG.selectAll('.edge').filter(function (d) {
                // return true;
                return ((_that.dependsLinkAndText.indexOf(d.source.index) == -1) && (_that.dependsLinkAndText.indexOf(d.target.index) == -1))
            }).transition().style('opacity', 1);
            _that.highlighted = null,
                _that.dependsNode = [],
                _that.dependsLinkAndText = [];
        }
    };

}


// 求两点间的距离
function getDis(s, t) {
    return Math.sqrt((s.x - t.x) * (s.x - t.x) + (s.y - t.y) * (s.y - t.y));
}

// 求元素移动到目标位置所需要的 transform 属性值
function getTransform(source, target, _dis) {
    var r;
    if (target.x > source.x) {
        if (target.y > source.y) {
            r = Math.asin((target.y - source.y) / _dis)
        } else {
            r = Math.asin((source.y - target.y) / _dis);
            r = -r;
        }
    } else {
        if (target.y > source.y) {
            r = Math.asin((target.y - source.y) / _dis);
            r = Math.PI - r;
        } else {
            r = Math.asin((source.y - target.y) / _dis);
            r -= Math.PI;
        }
    }
    r = r * (180 / Math.PI);
    return "translate(" + source.x + "," + source.y + ")rotate(" + r + ")";
}

module.exports = {
    D3MakeSvgPicClass: MakeSvgPicClass
};
{"nodes": [{"id": 41, "oid": "5a56e22893cc2b42a6bf001f", "type": "role", "name": "\u5468\u83b9", "avatar": "https://i.linkeddb.com/upload/image/2017920/140646844806.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf001f/", "exdata": {"id": 67864, "oid": "59fa71e218521569b662b81e", "name": "\u5b59\u4fea", "avatar": "https://i.linkeddb.com/person2/070d/d9c3/0fe9aa40e9c3014d23fadcce.jpg"}}, {"id": 42, "oid": "5a56e22893cc2b42a6bf0020", "type": "role", "name": "\u6c88\u661f\u79fb", "avatar": "https://i.linkeddb.com/upload/image/2017920/140848800133.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0020/", "exdata": {"id": 146808, "oid": "59fa798518521569b66a0707", "name": "\u9648\u6653", "avatar": "https://i.linkeddb.com/person2/5fe0/efe2/375e86834b0fd8e423ed46ad.jpg"}}, {"id": 44, "oid": "5a56e22893cc2b42a6bf0022", "type": "role", "name": "\u8d75\u767d\u77f3", "avatar": "https://i.linkeddb.com/upload/image/2017920/141152124754.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0022/", "exdata": {"id": 77558, "oid": "59fa72aa18521569b6637db9", "name": "\u4efb\u91cd", "avatar": "https://i.linkeddb.com/person2/f033/143e/fd25ff01c512e568bedb139f.jpg"}}, {"id": 49, "oid": "5a56e22893cc2b42a6bf0027", "type": "role", "name": "\u5468\u8001\u56db", "avatar": "https://i.linkeddb.com/upload/image/2017920/143059527666.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0027/", "exdata": {"id": 18420, "oid": "59fa6ee218521569b65fc164", "name": "\u5218\u4f69\u7426", "avatar": "https://i.linkeddb.com/person2/6dc0/474c/800b91826457c39b325db6d1.jpg"}}, {"id": 43, "oid": "5a56e22893cc2b42a6bf0021", "type": "role", "name": "\u5434\u8058", "avatar": "https://i.linkeddb.com/upload/image/2017920/141041905393.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0021/", "exdata": {"id": 76294, "oid": "59fa729b18521569b6636ff3", "name": "\u4f55\u6da6\u4e1c", "avatar": "https://i.linkeddb.com/person2/b4ab/93bf/76a67ed28d5bcf5e6e08d49e.jpg"}}, {"id": 50, "oid": "5a56e22893cc2b42a6bf0028", "type": "role", "name": "\u6c88\u56db\u6d77", "avatar": "https://i.linkeddb.com/upload/image/2017920/143624653261.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0028/", "exdata": {"id": 20839, "oid": "59fa6eff18521569b65fe02c", "name": "\u8c22\u541b\u8c6a", "avatar": "https://i.linkeddb.com/person2/ef23/5499/0faf910b5f1c74a5e5beedbf.jpg"}}, {"id": 47, "oid": "5a56e22893cc2b42a6bf0025", "type": "role", "name": "\u5434\u851a\u6587", "avatar": "https://i.linkeddb.com/upload/image/2017920/143212760960.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0025/", "exdata": {"id": 80081, "oid": "59fa72dd18521569b663b17a", "name": "\u5f20\u6668\u5149", "avatar": "https://i.linkeddb.com/person2/d951/b1d3/01f0a1ccfa0c8d2aef80f543.jpg"}}, {"id": 51, "oid": "5a56e22893cc2b42a6bf0029", "type": "role", "name": "\u5343\u7ea2", "avatar": "https://i.linkeddb.com/upload/image/2017920/144328263786.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0029/", "exdata": {"id": 15313, "oid": "59fa6ec018521569b65f9fd4", "name": "\u5468\u4e3d\u6dc7", "avatar": "https://i.linkeddb.com/person2/aa47/0381/6cd27a6f890af3440fc813cd.jpg"}}, {"id": 48, "oid": "5a56e22893cc2b42a6bf0026", "type": "role", "name": "\u5434\u6f2a", "avatar": "https://i.linkeddb.com/upload/image/2017920/142808729350.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0026/", "exdata": {"id": 171638, "oid": "59fa7e4f18521569b66dbcd9", "name": "\u66fe\u6dc7", "avatar": "https://i.linkeddb.com/upload/image/2017920/142410770419.jpg"}}, {"id": 833, "oid": "5a56e24b93cc2b42a6bf0337", "type": "role", "name": "\u6c88\u8001\u592b\u4eba", "avatar": "https://i.linkeddb.com/upload/742a/72f2/f933743cc2563895cb28a4ba.png", "url": "/movie/role/5a56e24b93cc2b42a6bf0337/", "exdata": {"id": 74843, "oid": "59fa729018521569b66364a3", "name": "\u5510\u7fa4", "avatar": "https://i.linkeddb.com/person2/97c3/9c83/fee3e8039a4c976f192447bf.jpg"}}, {"id": 832, "oid": "5a56e24b93cc2b42a6bf0336", "type": "role", "name": "\u6c88\u592b\u4eba", "avatar": "https://i.linkeddb.com/upload/05db/a955/dda11486be4f1b94717ea8bb.png", "url": "/movie/role/5a56e24b93cc2b42a6bf0336/", "exdata": {"id": 76304, "oid": "59fa729b18521569b6636eb9", "name": "\u5218\u6d01", "avatar": "https://i.linkeddb.com/person2/e8ac/f7a2/cf19348ed16ab3700bee93b9.jpg"}}, {"id": 55, "oid": "5a56e22893cc2b42a6bf002d", "type": "role", "name": "\u6c88\u6708\u751f", "avatar": "https://i.linkeddb.com/upload/image/2017920/165524797798.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf002d/", "exdata": {"id": 81417, "oid": "59fa72f718521569b663cccc", "name": "\u674e\u89e3", "avatar": "https://i.linkeddb.com/person2/8edb/31e8/c09ff047f76721dc268011fb.jpg"}}, {"id": 59, "oid": "5a56e22993cc2b42a6bf0031", "type": "role", "name": "\u5434\u9047", "avatar": "https://i.linkeddb.com/upload/image/2017920/171456600879.jpg", "url": "/movie/role/5a56e22993cc2b42a6bf0031/", "exdata": {"id": 155065, "oid": "59fa7ab118521569b66b0ae1", "name": "\u8bb8\u8bfa", "avatar": "https://i.linkeddb.com/person2/1cd8/47b9/04dc74ae4dbdc51614dd5e0d.jpg"}}, {"id": 45, "oid": "5a56e22893cc2b42a6bf0023", "type": "role", "name": "\u80e1\u548f\u6885", "avatar": "https://i.linkeddb.com/upload/image/2017920/141341851866.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0023/", "exdata": {"id": 25465, "oid": "59fa6f4c18521569b6602932", "name": "\u80e1\u674f\u513f", "avatar": "https://i.linkeddb.com/person2/dd65/89e5/6c3163f8fb99fbac5a2fde3a.jpg"}}, {"id": 46, "oid": "5a56e22893cc2b42a6bf0024", "type": "role", "name": "\u675c\u660e\u793c", "avatar": "https://i.linkeddb.com/upload/image/2017920/141611471224.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf0024/", "exdata": {"id": 105183, "oid": "59fa751618521569b665e8a2", "name": "\u4fde\u704f\u660e", "avatar": "https://i.linkeddb.com/upload/2c33/76de/923efcfad5f70b2755601530.png"}}, {"id": 56, "oid": "5a56e22893cc2b42a6bf002e", "type": "role", "name": "\u5434\u6cfd", "avatar": "https://i.linkeddb.com/upload/image/2017920/165926893902.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf002e/", "exdata": {"id": 156844, "oid": "59fa7af418521569b66b44e1", "name": "\u5f20\u5929\u9633", "avatar": "https://i.linkeddb.com/person2/75f6/f682/2dbdb23443d37793c5b44250.jpg"}}, {"id": 831, "oid": "5a56e24b93cc2b42a6bf0335", "type": "role", "name": "\u67e5\u5764", "avatar": "https://i.linkeddb.com/upload/48e2/810a/3675c7b3b157438ce5a42dbf.png", "url": "/movie/role/5a56e24b93cc2b42a6bf0335/", "exdata": {"id": 182836, "oid": "5a150881b0f85226cf8678e4", "name": "\u674e\u827a\u79d1", "avatar": "https://i.linkeddb.com/upload/4a66/509d/39a25ad4a12d1b6486a0ff91.jpg"}}, {"id": 54, "oid": "5a56e22893cc2b42a6bf002c", "type": "role", "name": "\u56fe\u5c14\u4e39", "avatar": "https://i.linkeddb.com/upload/image/2017920/165123228566.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf002c/", "exdata": {"id": 171640, "oid": "59fa7e4f18521569b66dbc29", "name": "\u9ad8\u5723\u8fdc", "avatar": "https://i.linkeddb.com/upload/image/2017920/164932735319.jpg"}}, {"id": 57, "oid": "5a56e22893cc2b42a6bf002f", "type": "role", "name": "\u738b\u4e16\u5747", "avatar": "https://i.linkeddb.com/upload/image/2017920/170109871241.jpg", "url": "/movie/role/5a56e22893cc2b42a6bf002f/", "exdata": {"id": 139118, "oid": "59fa789918521569b6692e47", "name": "\u674e\u6cfd\u950b", "avatar": "https://i.linkeddb.com/person2/2fc9/f05b/2cdce261a4389909b416e501.jpg"}}], "links": [{"source": 0, "target": 1, "type": "\u670b\u53cb", "color": "734646"}, {"source": 0, "target": 2, "type": "\u670b\u53cb", "color": "734646"}, {"source": 0, "target": 3, "type": "\u517b\u5973", "color": "f2826a"}, {"source": 0, "target": 4, "type": "\u4e3b\u4ec6", "color": ""}, {"source": 0, "target": 5, "type": "\u4ec7\u4eba", "color": ""}, {"source": 0, "target": 6, "type": "\u513f\u5ab3", "color": "e3dce3"}, {"source": 0, "target": 7, "type": "\u59d0\u59b9", "color": ""}, {"source": 0, "target": 8, "type": "\u5ac2\u5b50", "color": ""}, {"source": 1, "target": 9, "type": "\u5b59\u5b50", "color": "6681ae"}, {"source": 1, "target": 10, "type": "\u6bcd\u5b50", "color": ""}, {"source": 1, "target": 5, "type": "\u513f\u5b50", "color": "f2826a"}, {"source": 1, "target": 11, "type": "\u5144\u5f1f", "color": ""}, {"source": 1, "target": 2, "type": "\u5408\u4f5c", "color": ""}, {"source": 1, "target": 3, "type": "\u5e2e\u52a9", "color": ""}, {"source": 1, "target": 4, "type": "\u4ec7\u4eba", "color": ""}, {"source": 1, "target": 7, "type": "\u60c5\u4eba", "color": "fcb7e9"}, {"source": 4, "target": 11, "type": "\u7ade\u4e89", "color": ""}, {"source": 4, "target": 5, "type": "\u7ade\u4e89", "color": ""}, {"source": 4, "target": 6, "type": "\u513f\u5b50", "color": "f2826a"}, {"source": 4, "target": 8, "type": "\u5144\u59b9", "color": ""}, {"source": 4, "target": 12, "type": "\u5802\u5144\u5f1f", "color": ""}, {"source": 4, "target": 2, "type": "\u6c11\u4e0e\u5b98", "color": ""}, {"source": 4, "target": 13, "type": "\u9752\u6885\u7af9\u9a6c", "color": ""}, {"source": 4, "target": 14, "type": "\u88ab\u5e2e\u52a9", "color": ""}, {"source": 2, "target": 15, "type": "\u540c\u7a97", "color": ""}, {"source": 2, "target": 14, "type": "\u5408\u4f5c", "color": ""}, {"source": 13, "target": 0, "type": "\u4ec7\u4eba\u80e1\u548f\u6885\u6b7b\u4ea1", "color": ""}, {"source": 13, "target": 14, "type": "\u6c42\u52a9", "color": ""}, {"source": 13, "target": 6, "type": "\u6c42\u52a9", "color": ""}, {"source": 14, "target": 5, "type": "\u5229\u7528", "color": ""}, {"source": 14, "target": 16, "type": "\u4e3b\u4ec6", "color": ""}, {"source": 14, "target": 0, "type": "\u4ec7\u4eba", "color": ""}, {"source": 14, "target": 1, "type": "\u4ec7\u4eba", "color": ""}, {"source": 14, "target": 6, "type": "\u8ba4\u8bc6", "color": ""}, {"source": 14, "target": 11, "type": "\u5229\u7528", "color": ""}, {"source": 8, "target": 2, "type": "\u592b\u59bb", "color": "fcb7e9"}, {"source": 8, "target": 7, "type": "\u4e92\u770b\u4e0d\u60ef", "color": ""}, {"source": 8, "target": 15, "type": "\u5144\u59b9", "color": ""}, {"source": 17, "target": 0, "type": "\u5408\u4f5c", "color": ""}, {"source": 17, "target": 1, "type": "\u7edd\u4ea4", "color": ""}, {"source": 15, "target": 0, "type": "\u5ac2\u5b50", "color": ""}, {"source": 18, "target": 0, "type": "\u4ec6\u4eba", "color": ""}, {"source": 12, "target": 14, "type": "\u88ab\u5e2e\u52a9", "color": ""}, {"source": 10, "target": 9, "type": "\u5a46\u5ab3", "color": ""}]}';
