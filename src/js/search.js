function displaySearchResults(response){
    console.log(response);

    var block = $('#search_results');

    block.append($('<h3>Query</h3>'));
    block.append($('<p>' + response['query'] + '</p>'));
    block.append($('<h3>Results</h3>'));

    var results = response['searchResults']['entry'];

    if(results){
        results.forEach(function(result){
            //<h4>/3/files/docs/another_directory/Google Dapper.pdf <span> &mdash; <a>KY80s~7TaBpwSu~2QkjY-13cb4328746-5S5NJXgv</a></span></h4>
            var header = $('<h4>' + result['path'] + '</h4>');

            var span = $('<span> &mdash; </span>');
            span.append($('<a>' + result['address'] + '</a>'))
            header.append(span);
            block.append(header);

            var fragments = result['fragments']['fragment'];

            fragments.forEach(function(fragment){
                var paragraph = $('<p></p>');
                paragraph.append($('<span>Found in <i>' + fragment['field'] + '</i>:</span>'));

                var list = $('<ul></ul>');
                paragraph.append(list);

                var strings = fragment['foundStrings']['string'];

                strings.forEach(function(str){
                    var entry = $('<li></li>');
                    entry.append(str);
                    list.append(entry);
                });

                block.append(paragraph);
            })
        });

        var plainText = $('#search_results_plain');
        plainText.append('Query\n');
        plainText.append(response['query'] + '\n\n');

        results = response['searchResults']['entry'];

        if(results){
            results.forEach(function(result){
                plainText.append(result['path']);
                plainText.append('-');
                plainText.append(result['address']);
                plainText.append('\n');

                var fragments = result['fragments']['fragment'];

                fragments.forEach(function(fragment){

                    plainText.append('Found in ' + fragment['field'] + ':\n');
                    var strings = fragment['foundStrings']['string'];

                    strings.forEach(function(str){
                        plainText.append(str);
                        plainText.append('\n');
                    });
                })

            });
        }
    }

    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        'title': 'Copy All',
        'id': 'copyItem'
    });

    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        var textArea = $('#search_results_plain');

        textArea.css('visibility', 'visible');
        textArea.focus();
        textArea.select();
        document.execCommand("Copy");
        textArea.css('visibility', 'hidden');
    });
}