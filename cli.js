/**
 * Created with IntelliJ IDEA.
 * User: aphreet
 * Date: 5/10/13
 * Time: 01:19
 * To change this template use File | Settings | File Templates.
 */

var cliCommands = {};

cliCommands['help'] = cliCommandHelp;
cliCommands['connect'] = cliCommandConnect;
cliCommands['ls'] = cliCommandLs;
cliCommands['show'] = cliShowFile;

function cliExecuteCommand(command, context, onComplete){

    var commandArray = command.split(" ");

    var commandName = commandArray[0];
    var commandArgs = commandArray.slice(1);

    var cliFunc = cliFindCommand(commandName);

    cliFunc(commandArgs, context, onComplete);
}

function cliFindCommand(name){

    if(name in cliCommands){
        return cliCommands[name];
    }else{
        return cliCommandNotFound;
    }
}

function cliCommandConnect(args, context, onComplete){
    var host = args[0];
    var domain = args[1];
    var key = args[2];

    context.c3Host = host;
    context.c3Domain = domain;
    context.c3Key = key;

    onComplete(context, 'Connected to ' + host + ' using domain ' + domain)
}

function cliCommandLs(args, context, onComplete){

    callC3Api(context, '/rest/fs/', 'get', function(response){
        onComplete(context, response["directory"]);
    });

}

function cliShowFile(args, context, onComplete){
    chrome.app.window.create({
        'url': 'http://node0.c3.ifunsoftware.com/rest/fs/65/files/%D0%91%D0%B5%D0%B7%D1%8B%D0%BC%D1%8F%D0%BD%D0%BD%D1%8B%D0%B9.png',
        'type': 'popup'
    }, function(window){})
}

function cliCommandHelp(args, context, onComplete){
    onComplete(context, 'This is help output')
}

function cliCommandNotFound(args, context, onComplete){
    onComplete(context, 'Command not found, args ' + args)
}

function callC3Api(context, uri, method, callback){

    var request = new Request.JSON({
        url: 'http://' + context.c3Host + uri,
        method: method,
        headers: {
            'Accept': 'application/json'
        },
        onSuccess: function(responseJSON, responseText){

            var response = responseJSON['p:response'];

            alert(response["info"]["status"]);

            callback(response)
        }
    });

    request.send();
}

