(function($) {
    var helper = {
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

        buildWordList: function() {

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

        bindEvent: function(container, content, restWords, options, indexes, groups) {
            $('#reset').click(function(e) {
                var isconfirm = confirm('are you sure?');
                if(isconfirm){
                  var learnedWords = localStorage.getItem('learnedWords') ? $.parseJSON(localStorage.getItem('learnedWords')) : [];
                    if (learnedWords.length) {
                        restWords = restWords.concat(learnedWords);
                        localStorage.removeItem('learnedWords');
                        helper.build(content, restWords, options, indexes, groups);
                    }
                }
            });
            container.find('#get_tips').click(function(e) {
                content.find('.tips').show('fast');
            }).end().find('#confirm').click(function(e) {
                if ($(this).val() !== 'next') {
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

                    $(this).text('下一个').val('next');

                } else {
                    helper.build(content, restWords, options, indexes, groups);
                    $(this).text('确定').val('confirm');
                }

            });
        }
    }
    $(document).ready(function($) {
        var options = {
            checkNumbers: 5,
            isRandom: true
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
