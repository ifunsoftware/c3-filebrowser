/**
 * Created with IntelliJ IDEA.
 * User: aphreet
 * Date: 5/10/13
 * Time: 01:19
 * To change this template use File | Settings | File Templates.
 */

var cliCommands = {};

cliCommands['help'] = {
    func: cliCommandHelp,
    name: 'help',
    description: 'Displays help message'
};

cliCommands['connect'] = {
    func: cliCommandConnect,
    name: 'connect',
    description: 'Connects to the c3 system'
};

cliCommands['disconnect'] = {
    func: cliCommandDisconnect,
    name: 'disconnect',
    description: 'Disconnects from the c3 system'
};

cliCommands['ls'] = {
    func: cliCommandLs,
    name: 'ls',
    description: 'Lists files in the directory'
};

cliCommands['show'] = {
    func: cliShowFile,
    name: 'show',
    description: 'Opens file\'s content in the new window [DOES NOT WORK]'
};

cliCommands['cd'] = {
    func: cliCd,
    name: 'cd',
    description: 'Changes current working directory'
};

cliCommands['pwd'] = {
    func: cliPwd,
    name: 'pwd',
    description: 'Displays current working directory'
};

cliCommands['file'] ={
    func: cliFile,
    name: 'file',
    description: 'Displays information about file'
}

var offlineCommands = ['help', 'connect'];

function cliExecuteCommand(command, context, onComplete){

    var commandArray = command.split(" ");

    var commandName = commandArray[0];
    var commandArgs = commandArray.slice(1);

    if(!offlineCommands.contains(commandName)){
        if(context.c3Host == null){
            onComplete(context, "Client is not connected. Please connect first")
            return;
        }
    }

    var cliFunc = cliFindCommand(commandName).func;

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

    if(context.host != null){
        onComplete(context, "Client is already connected, please disconnect first");
        return;
    }

    if(args.length == 0){
        onComplete(context, "Host argument required.\n Example: connect localhost:7373")
        return;
    }

    var host = args[0];
    var domain = args[1];
    var key = args[2];

    context.c3Host = host;
    context.c3Domain = domain;
    context.c3Key = key;

    callC3Api(context, '/rest/status', 'get', {},
        function(response){

            var modules = response['status']['modules']['module'];

            var version = null;

            modules.forEach(function(module){
               if(module['name'] == 'org.aphreet.c3.platform.access.rest'){
                   version = module['version'];
               }
            });

            onComplete(context, 'Connected to ' + host + ' using domain ' + domain + ", api version " + version);
        },
        function(error){
            context.c3Host = null;
            context.c3Domain = null;
            context.c3Key = null;
            onComplete(context, 'Failed to connect to host ' + host + ', error is ' + error);
        }
    );
}

function cliCommandDisconnect(args, context, onComplete){
    context.c3Host = null;
    context.c3Domain = null;
    context.c3Key = null;
    context.c3CurrentDir = "/";
    context.c3CurrentDirName = "/";

    onComplete(context, "Disconnected")
}

function cliEvaluatePath(context, args){

        if(args.length == 0){
            return context.c3CurrentDir;
        }

        var path = args[0];


        if(path.length == 0 || path[0] != '/'){
            path = context.c3CurrentDir + path;
        }

        var pathComponents = path.split("/");

        var pathStack = [];

        pathComponents.forEach(function(item){
            switch(item){
                case "":
                    break;
                case ".":
                    break;
                case "..":{
                    if(pathStack.length != 0){
                        pathStack.pop();
                    }
                    break;
                }
                default :{
                    pathStack.push(item);
                }
            }
        });

        var finalPath = "/" + pathStack.join("/");

        if(finalPath != "/"){
            finalPath = finalPath + "/";
        }

        return finalPath;
    }

function cliCd(args, context, onComplete){

    var newPath = cliEvaluatePath(context, args);

    checkIfDirectoryExists(context, newPath, onComplete, function(){
        context.c3CurrentDir = newPath;

        var components = newPath.split("/").filter(function(item){
            return item != "";
        });

        if(components.length == 0){
            context.c3CurrentDirName = "/";
        }else{
            context.c3CurrentDirName = components.pop();
        }
        onComplete(context, "")
    });
}

function cliPwd(args, context, onComplete){
    onComplete(context, context.c3CurrentDir);
}

function buildFiles(response){

    function translateKey(key){
        var keys = {
            'c3.data.length' : 'size',
            'c3.created': 'created',
            'c3.updated': 'modified',
            'c3.data.hash': 'hash',
            'c3.versions.number': 'versions'
        };

        return keys[key];
    }

    var fsNodes = response['directory']['nodes']['node'];

    var files = [];

    if(fsNodes == null){
        return files;
    }

    fsNodes.forEach(function(node){

        var file = {};
        file['name'] = node['name'];
        file['directory'] = !node['leaf'];

        var metadata = node['metadata']['element'];

        metadata.forEach(function(entry){
            file[translateKey(entry['@key'])] = entry['value'];
        });

        if(!file.hasOwnProperty('modified')){
            file['modified'] = file['created'];
        }

        files.push(file);
    });

    return files;
}

function cliCommandLs(args, context, onComplete){

    var headers = {
        'x-c3-meta': 'system.c3.updated,system.c3.created,system.c3.data.length,system.c3.data.hash,system.c3.versions.number'
    };

    var dir = "";

    if(args.length == 0){
        dir = context.c3CurrentDir;
    }else{
        var path = args[0];
        if(path[0] == '/'){
            dir = path;
        }else{
            dir = context.c3CurrentDir + path;
        }
    }

    checkIfDirectoryExists(context, dir, onComplete, function(){

        callC3Api(context, '/rest/fs' + dir, 'get', headers, function(response){

            var files = buildFiles(response);

            files.forEach(function(file){

                file['hash'] = file['hash'].substr(0, 6);
                if(file['directory'])
                    file['directory'] = 'd';
                else
                    file['directory'] = 'f';

                file['modified'] = formatTimestamp(file['modified']);

                file['size'] = bytesToSize(file['size'], 2)
            });

            onComplete(context, buildFileTable(files,
                ['directory', 'size', 'modified', 'hash', 'versions', 'name'],
                "%s %9s %s %s %2d %s"));
        }, function(code){
            onComplete(context, 'Failed to execute call, error code is ' + code)
        });
    });
}

function checkIfDirectoryExists(context, path, onComplete, continuation){
    callC3Api(context, '/rest/fs' + path + '?metadata', 'get', {}, function(response){
        var sysmd = response['resource']['systemMetadata']['element'];

        var isDirectory = false;

        sysmd.forEach(function(entry){
            if(entry['@key'] == 'c3.fs.nodetype'){
                if(entry['value'] == 'directory'){
                    isDirectory = true;
                }
            }
        });

        if(!isDirectory){
            onComplete(context, "Specified path is not a directory")
        }else{
            continuation();
        }
    }, function(code){
        onComplete(context, 'Failed to execute call, error code is ' + code)
    });
}

function buildFileTable(items, fields, format){
    var result = "";

    items.forEach(function(item){

        var values = [];

        fields.forEach(function(field){
            values.push(item[field]);
        });

        result = result + String.form(format, values) + "\n";
    });

    return result;
}

function cliShowFile(args, context, onComplete){

    var path = cliEvaluatePath(context, args);

    chrome.windows.create({
        'url': 'http://' + context.c3Host + '/rest/fs' + path,
        'type': 'popup'
    }, function(window){
        onComplete(context, "");
    })
}

function cliCommandHelp(args, context, onComplete){

    var result = 'Available commands: \n';

    Object.keys(cliCommands).sort().forEach(function(item){
        result = result + '\t' + cliCommands[item].name + ": " + cliCommands[item].description + "\n";
    });

    onComplete(context, result)
}

function cliCommandNotFound(args, context, onComplete){
    onComplete(context, 'Command not found, args ' + args)
}

function cliFile(args, context, onComplete){

    var path = cliEvaluatePath(context, args);

    callC3Api(context, '/rest/fs' + path + "?metadata", 'get', {},
        function(response){

            var resource = response['resource'];

            var output = [];

            output.push(path + ' information:');
            output.push('\tAddress: ' + resource['address']);
            output.push('\tCreated: ' + resource['createDate']);
            output.push('\tKeeps versions: ' + resource['trackVersions']);

            output.push('\tUser metadata:');
            cliProcessCollection(resource['metadata']['element'], function(item){
                output.push(cliMdItemToString(item))
            });


            output.push('\tSystem metadata:');
            cliProcessCollection(resource['systemMetadata']['element'], function(item){
               output.push(cliMdItemToString(item));
            });

            output.push('\tTransient metadata:');
            var sysMd = resource['transientMetadata']['element'];
            cliProcessCollection(sysMd, function(item){
                output.push(cliMdItemToString(item));
            });


            output.push('\tVersions:');

            cliProcessCollection(resource['versions']['version'], function(version){
                output.push(String.form('\t\t %s %7s %s', [version['@date'], bytesToSize(version['@length']), version['@hash']]));
            });

            var result = '';

            output.forEach(function(item){
               result = result + item + "\n";
            });

            onComplete(context, result);
        },
        function(error){
            onComplete(context, 'Failed to execute call, error is ' + error)
        }
    );
}

function cliProcessCollection(collection, func){

    function cliCompareMetadata(a,b) {

        var keyA = a['@key'];
        var keyB = b['@key'];

        if (keyA < keyB)
            return -1;
        if (keyA > keyB)
            return 1;
        return 0;
    }

    if(Array.isArray(collection)){
        collection.sort(cliCompareMetadata).forEach(function(item){
            func(item);
        });
    }else{
        if(collection){
            func(collection)
        }
    }
}



function cliMdItemToString(item){
    return "\t\t" + item['@key'] + ': ' + item['value'];
}

function callC3Api(context, uri, method, headers, callback, failureCallback){

    headers['Accept'] = 'application/json';

    var request = new Request.JSON({
        url: 'http://' + context.c3Host + uri,
        method: method,
        headers: headers,
        onSuccess: function(responseJSON, responseText){

            if(responseJSON != null){
                var response = responseJSON['p:response'];

                if(response["info"]["status"] != "OK"){
                    console.log(responseText);
                    failureCallback("Response status is not ok");
                }else{
                    callback(response)
                }
            }else{
                failureCallback("Can't parse JSON response");
            }

        },
        onFailure: function(xhr){
            failureCallback(xhr.status)
        }
    });

    request.send();
}

