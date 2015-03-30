(function($) {
    var helper = {

        // 对单词列表重新排序
        reSort: function(data) {
            function compare(a, b) {
                if (a.approx < b.approx)
                    return -1;
                if (a.approx > b.approx)
                    return 1;
                return 0;
            }
            return data.sort(compare);
        },

        // 按相近的意思重新分组
        getGroups: function(data) {
            var groups = {},
                key;
            for (var i = 0; i < data.length; i++) {
                key = data[i].approx;
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(data[i].name);
            }
            return groups;
        },

        // 以每个单词为关键词，建立索引，快速查询单词详细信息
        getIndexes: function(data) {
            var indexes = {};
            for (var i = data.length - 1; i >= 0; i--) {
                indexes[data[i].name] = {
                    des: data[i].des,
                    approx: data[i].approx
                }
            };
            return indexes;
        },

        // 获取一个介于min和max之间的整型随机数
        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        },

        // 随机抽取数组中的值
        getRandomValues: function(data, numbers) {
            var sortData = data.sort(function() {
                return 0.5 - Math.random()
            });
            return sortData.slice(0, numbers);
        },

        buildWordList: function(container) {
            var restWords = localStorage.getItem('restWords'),
                learnedWords = localStorage.getItem('learnedWords');
            if (!restWords && !learnedWords) {
                return;
            }

            var tmpl = ['<div class="panel panel-default">'];

            restWords = $.parseJSON(restWords);
            learnedWords = $.parseJSON(learnedWords);

            // 已掌握单词渲染
            if (learnedWords.length) {
                learnedWords = helper.reSort(learnedWords);
                tmpl.push('<div class="panel-heading" role="tab" id="panelLearned">',
                    '<h4 class="panel-title">',
                    // '<a data-toggle="collapse" href="#panelLearned" aria-expanded="true" aria-controls="panelLearned">',
                    '已掌握 ', learnedWords.length,
                    '</h4></div>',
                    // '<div id="panelLearned" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="panelHeadLearned" aria-expanded="true">',
                    '<ul class="list-group">');

                $.each(learnedWords, function(i, item) {
                    tmpl.push('<li class="list-group-item list-group-item-success">',
                        '<h4 class="list-group-item-heading">', item.name, '</h4>',
                        '<p class="list-group-item-text">【', item.approx, '】', item.des, '</p>',
                        '</li>');
                });

                tmpl.push('</ul>');
            }

            // 未掌握单词渲染
            if (restWords.length) {
                restWords = helper.reSort(restWords);
                tmpl.push('<div class="panel-heading" role="tab" id="panelUnlearned">',
                    '<h4 class="panel-title">',
                    '未掌握 ', restWords.length,
                    '</h4></div>',
                    // '<div id="panelUnlearned" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="panelHeadUnlearned" aria-expanded="true">',
                    '<ul class="list-group">');
                $.each(restWords, function(i, item) {
                    item.repeats && tmpl.push('<li class="list-group-item list-group-item-warning">') || tmpl.push('<li class="list-group-item">');
                    tmpl.push('<h4 class="list-group-item-heading">', item.name, '</h4>',
                        '<p class="list-group-item-text">【', item.approx, '】', item.des, '</p>',
                        '</li>');
                });
                tmpl.push('</ul>');
            }

            tmpl.push('</div>');

            container.html(tmpl.join(''));
        },
        // 渲染FlashCards
        build: function(content, restWords, options, indexes, groups) {
            var index = -1,
                approxNum = 0, // 抽取checkList的近义词的个数
                antiNum, // 反义词个数
                restNum,
                thisWord, // 当前单词
                checkList = [], // 选项列表
                tmpl = [],
                checkListTmpl = [],
                isRepeat = content.data('isRepeat'),
                learnedWords = localStorage.getItem('learnedWords') ? $.parseJSON(localStorage.getItem('learnedWords')) : [];

            // localStorage.setItem('wordList', JSON.stringify(restWords));

            // 检查是否上个单词需重学
            if (isRepeat && learnedWords.length) {
                var reviewWord = learnedWords.pop();
                reviewWord.repeats = reviewWord.repeats ? ++reviewWord.repeats : 1;
                restWords.push(reviewWord);
            } else if (isRepeat === undefined) {
                learnedWords.length && restWords.push(learnedWords.pop()); // 页面重新刷新时，把之前已学的单词再放回去
            }

            index = options.isRandom ? helper.getRandomInt(0, restWords.length - 1) : index + 1;
            thisWord = restWords.splice(index, 1)[0];
            learnedWords.push(thisWord);

            approxNum = helper.getRandomInt(1, options.checkNumbers - 1); // 至少留一个不是同义的
            antiNum = helper.getRandomInt(0, (options.checkNumbers - approxNum));
            restNum = options.checkNumbers - antiNum - approxNum;

            var approxList = helper.getRandomValues(groups[thisWord.approx], approxNum),
                antiList = helper.getRandomValues(groups[thisWord.anti], antiNum),
                sortData = helper.getRandomValues(restWords, restWords.length);

            checkList = approxList.concat(antiList);

            for (var i = 1; i < sortData.length; i++) {
                if (!restNum) {
                    break;
                }
                if (checkList.indexOf(sortData[i].name) > -1) {
                    continue;
                }
                checkList.push(sortData[i].name);
                restNum--;
            };

            // 单词选项列表模板
            $.each(checkList, function(i, val) {
                if (indexes[val]) {
                    checkListTmpl.push(
                        '<a class="checklist list-group-item">',
                        '<h4 class="list-group-item-heading">',
                        '<span class="mk glyphicon glyphicon-unchecked" aria-hidden="true"></span>',
                        '<span class="word">', val, '</span>',
                        '<span class="mk-icon glyphicon pull-right" aria-hidden="true"></span>',
                        '</h4>',
                        '<span class="tips list-group-item-text">', indexes[val].approx, '</span>',
                        '</a>'
                    );
                }
            });

            // flashcard模板
            tmpl = ['<div class="row">',
                '<div class="col-xs-12 col-sm-12 col-md-12">',
                '<h1>', thisWord.name, '</h1>',
                '<p class="tips">', '【', thisWord.approx, '】', thisWord.des, '</p>',
                '</div>',
                '</div>',
                '<div class="row">',
                '<div class="col-xs-12">',
                '<div id="word-list" class="list-group">',
                checkListTmpl.join(''),
                '</div>',
                '</div></div>'
            ];

            var totalNum = learnedWords.length + restWords.length,
                tmplDom = $(tmpl.join('')).find('.checklist').click(function(e) {
                    $(this).find('.mk').toggleClass('glyphicon-check').toggleClass('glyphicon-unchecked');
                }).end();

            content.html(tmplDom)
                .data('thisWord', thisWord);

            $('#learned').html(learnedWords.length + ' / ' + totalNum);

            learnedWords.length && localStorage.setItem('learnedWords', JSON.stringify(learnedWords));
            restWords.length && localStorage.setItem('restWords', JSON.stringify(restWords));

        },

        // 绑定按钮事件
        bindEvent: function(container, content, restWords, options, indexes, groups) {

            // bind reset
            $('#tab_reset').click(function(e) {
                var isconfirm = confirm('are you sure?');
                if (isconfirm) {
                    var learnedWords = localStorage.getItem('learnedWords') ? $.parseJSON(localStorage.getItem('learnedWords')) : [];
                    if (learnedWords.length) {
                        restWords = restWords.concat(learnedWords);
                        localStorage.removeItem('learnedWords');
                        helper.build(content, restWords, options, indexes, groups);
                    }
                }
            });

            $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
                var tabId = $(this).attr('href'),
                    wordListContainer = $('#wordlist');
                if (tabId == '#wordlist') {
                    helper.buildWordList(wordListContainer);
                }
            });

            // bind buttons (get tips and confirm) in flashcard
            container.find('#get_tips').click(function(e) {
                    content.find('.tips').show('fast');
                })
                .end()
                .find('#confirm')
                .click(function(e) {
                    var $thisConfirm = $(this);
                    if ($thisConfirm.val() !== 'next') {
                        var list = content.find('.checklist'),
                            thisWord = content.data('thisWord'),
                            isRepeat = false, // 是否选错了，需重新学习
                            wordText,
                            isChecked;
                        $.each(list, function(i, item) {
                            var $item = $(item);
                            wordText = $item.find('.word').text().replace(/\s/gi, '');
                            isChecked = $item.find('.mk').hasClass('glyphicon-check');
                            if (indexes[wordText].approx === thisWord.approx) {
                                if (isChecked) {
                                    $item.addClass('list-group-item-success').find('.mk-icon').addClass('glyphicon-ok');
                                } else {
                                    isRepeat = true;
                                    $item
                                        .addClass('list-group-item-warning')
                                        .find('.mk-icon')
                                        .addClass('glyphicon-ok')
                                        .end()
                                        .find('.tips')
                                        .show('fast');
                                }
                            } else {
                                if (isChecked) {
                                    isRepeat = true;
                                    $item.addClass('list-group-item-danger').find('.mk-icon').addClass('glyphicon-remove').end().find('.tips').show('fast');
                                }
                            }
                        });
                        content.data('isRepeat', isRepeat);

                        $thisConfirm.text('下一个').val('next');

                        !isRepeat && setTimeout(function(){
                          $thisConfirm.trigger('click');
                        }, 1000);

                    } else {
                        helper.build(content, restWords, options, indexes, groups);
                        $thisConfirm.text('确定').val('confirm');
                    }

                });
        }
    }
    $(document).ready(function($) {
        var options = {
            checkNumbers: 4, // 选项个数
            isRandom: true // 是否随机出单词
        }
        var restWords = localStorage.getItem('restWords'),
            learnedWords = localStorage.getItem('learnedWords'),
            container = $('#flashcard'),
            content = container.find('#content');


        if (!restWords && !learnedWords) {
            $.ajax({
                    url: 'data.json',
                    dataType: 'json'
                })
                .done(function(data) {
                    if (data) {
                        var indexes = helper.getIndexes(data),
                            groups = helper.getGroups(data);

                        helper.build(content, data, options, indexes, groups);

                        helper.bindEvent(container, content, data, options, indexes, groups);
                    }
                })
                .error(function(a, b, c) {
                    debugger;
                });
        } else {
            restWords = $.parseJSON(restWords);
            learnedWords = $.parseJSON(learnedWords);

            var totalWords = restWords.concat(learnedWords),
                indexes = helper.getIndexes(totalWords),
                groups = helper.getGroups(totalWords);


            helper.build(content, restWords, options, indexes, groups);

            helper.bindEvent(container, content, restWords, options, indexes, groups);

            if (!restWords.length) {
                content.html('已学完');
                return;
            }
        }


    });

})(jQuery);
