function displaySearchResults(response){
    console.log(response);

    var block = $('#search_results');

    block.append($('<h3>Query</h3>'));
    block.append($('<p>' + response['query'] + '</p>'))
    block.append($('<h3>Results</h3>'))

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
    }

}