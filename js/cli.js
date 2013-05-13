/**
 * Created with IntelliJ IDEA.
 * User: aphreet
 * Date: 5/10/13
 * Time: 01:19
 * To change this template use File | Settings | File Templates.
 */

var cliCommands = {};

//var embedWindow = null;

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
    func: cliCommandShowFile,
    name: 'show',
    description: 'Opens file\'s content in the new window'
};

cliCommands['cd'] = {
    func: cliCommandCd,
    name: 'cd',
    description: 'Changes current working directory'
};

cliCommands['pwd'] = {
    func: cliCommandPwd,
    name: 'pwd',
    description: 'Displays current working directory'
};

cliCommands['file'] = {
    func: cliCommandFile,
    name: 'file',
    description: 'Displays information about file'
};

cliCommands['mkdir'] = {
    func: cliCommandMkDir,
    name: 'mkdir',
    description: 'Creates new directory'
};

cliCommands['setmd'] = {
    func: cliCommandSetMd,
    name: 'setmd',
    description: 'Sets metadata pair on file'
};

cliCommands['rmmd'] = {
    func: cliCommandRmMd,
    name: 'rmmd',
    description: 'Removes metadata from file'
};

cliCommands['rm'] = {
    func: cliCommandRm,
    name: 'rm',
    description: 'Deletes file'
};

cliCommands['mv'] = {
    func: cliCommandMv,
    name: 'mv',
    description: 'Moves or renames file'
};

cliCommands['put'] = {
    func: cliCommandPut,
    name: 'put',
    description: 'Uploads file to c3 system'
};

var defaultCommand = {
    func: cliCommandNotFound
};

var cliOfflineCommands = ['help', 'connect'];

function cliExecuteCommand(command, context, onComplete){

    var commandArray = command.split(" ");

    var commandName = commandArray[0];
    var commandArgs = commandArray.slice(1);

    if($.inArray(commandName, cliOfflineCommands) == -1){
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
        return defaultCommand;
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

            if(context.c3Domain != null){
                onComplete(context, 'Connected to ' + host + ' using domain ' + domain + ', api version ' + version);
            }else{
                onComplete(context, 'Connected to ' + host + ', api version ' + version);
            }
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

function cliCommandCd(args, context, onComplete){

    var newPath = cliEvaluatePath(context, args);

    cliCheckIfDirectoryExists(context, newPath, onComplete, function(address){
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

function cliCommandPwd(args, context, onComplete){
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

    cliCheckIfDirectoryExists(context, dir, onComplete, function(address){

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

function cliCommandMkDir(args, context, onComplete){

    var path = cliEvaluatePath(context, args);

    callC3Api(context, '/rest/fs' + path, 'post', {'x-c3-nodetype': 'directory'},
        function(response){
            onComplete(context, '');
        },
        function(error){
            onComplete(context, 'Failed to create directory, error: ' + error)
        }
    );
}

function cliCommandSetMd(args, context, onComplete){

    if(args.length < 3){
        onComplete(context, 'Not enough arguments');
        return;
    }

    var path = cliEvaluatePath(context, args);

    var key = args[1];
    var value = args.slice(2).join(' ');

    callC3Api(context, '/rest/fs' + path, 'put', {'x-c3-metadata': key + ':' + Base64.encode(value)},
        function(response){
            onComplete(context, '');
        },
        function(error){
            onComplete(context, 'Failed to set metadata, error: ' + error)
        }
    );
}

function cliCommandRmMd(args, context, onComplete){
    if(args.length < 2){
        onComplete(context, 'Not enough arguments');
        return;
    }

    var path = cliEvaluatePath(context, args);

    var key = args[1];

    callC3Api(context, '/rest/fs' + path, 'put', {'x-c3-metadata-delete': key},
        function(response){
            onComplete(context, '');
        },
        function(error){
            onComplete(context, 'Failed to set metadata, error: ' + error)
        }
    );

}

function cliCheckIfDirectoryExists(context, path, onComplete, continuation){
    cliCheckIfExists(context, path, true, onComplete, continuation)
}

function cliCheckIfFileExists(context, path, onComplete, continuation){
    cliCheckIfExists(context, path, false, onComplete, continuation)
}

function cliCheckIfExists(context, path, directoryRequired, onComplete, continuation){
    callC3Api(context, '/rest/fs' + path + '?metadata', 'get', {}, function(response){

        var address = response['resource']['address']

        var sysmd = response['resource']['systemMetadata']['element'];

        var isDirectory = false;

        sysmd.forEach(function(entry){
            if(entry['@key'] == 'c3.fs.nodetype'){
                if(entry['value'] == 'directory'){
                    isDirectory = true;
                }
            }
        });

        if(isDirectory ^ directoryRequired){

            if(directoryRequired){
                onComplete(context, "Specified path is not a directory")
            }else{
                onComplete(context, "Specified path is a directory")
            }
        }else{
            continuation(address)
        }
    }, function(code){
        onComplete(context, 'Failed to execute call, error: ' + code)
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

function cliCommandShowFile(args, context, onComplete){

    var path = cliEvaluatePath(context, args);

    cliCheckIfFileExists(context, path, onComplete, function(address){
        callC3Api(context, '/rest/once/' + address, 'post', {},
            function(response){

                chrome.app.window.create('data.html', {
                        'width': 800,
                        'height': 600
                    }, function(embedWindow){

                        embedWindow.contentWindow.onload = function(){
                            console.log("Ready!");
                            embedWindow.contentWindow.document.querySelector("#contentwebview").src = 'http://' + context.c3Host + '/rest' + response['uri'];
                        };
                        onComplete(context, '');
                    }
                );
            },
            function(error){
                onComplete(context, 'Failed to execute request, error: ' + error)
            }
        );
    });
}

function cliCommandRm(args, context, onComplete){

    var file = cliEvaluatePath(context, args);

    callC3Api(context, '/rest/fs' + file, 'delete', {},
        function(response){
            onComplete(context, '')
        },
        function(error){
            onComplete(context, 'Failed to execute command, error: ' + error)
        }
    );
}

function cliCommandMv(args, context, onComplete){

    if(args.length < 2){
        onComplete(context, 'Not enough arguments');
        return;
    }

    var sourcePath = cliEvaluatePath(context, args);

    var destPath = cliEvaluatePath(context, args.slice(1));

    callC3Api(context, '/rest/fs' + sourcePath, 'put', {'x-c3-op': 'move'},
        function(response){
            onComplete(context, '')
        },
        function(error){
            onComplete(context, 'Failed to execute command, error: ' + error)
        },
        destPath
    );

}

function cliCommandPut(args, context, onComplete){

    if(args.length < 1){
        onComplete(context, 'Not enough arguments');
    }

    var destPath = cliEvaluatePath(context, args);

    chrome.fileSystem.chooseEntry({}, function(entry){
        console.log(entry)
    });

    onComplete(context, 'Done')
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

function cliCommandFile(args, context, onComplete){

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

function callC3Api(context, uri, method, headers, callback, failureCallback, data){

    headers['Accept'] = 'application/json';

    if(context.c3Domain != null){
        headers['x-c3-domain'] = context.c3Domain
    }

    if(context.c3Key != null){
        var date = (new Date()).toUTCString();
        headers['x-c3-date'] = date;

        var hashBase = uri.split("?")[0] + date + context.c3Domain;

        //console.log(hashBase);
        headers['x-c3-sign'] = CryptoJS.HmacSHA256(hashBase, context.c3Key).toString(CryptoJS.enc.Hex);

        //console.log(headers['x-c3-sign'])
    }

    $.ajax('http://' + context.c3Host + uri, {
        accepts: 'application/json',
        cache: false,
        headers: headers,
        type: method,
        processData: false,
        data: data,
        error: function(jqXHR, textStatus, errorThrown){
            var json = JSON.parse(jqXHR.responseText);
            var message = json['p:response']['error']['message']

            if(message){
                failureCallback(message)
            }else{
                failureCallback(jqXHR.status)
            }
        },
        success: function(data, textStatus, jqXHR){
            var json = JSON.parse(jqXHR.responseText);

            if(json){
                var response = json['p:response'];

                if(response["info"]["status"] != "OK"){
                    failureCallback("Response status is not ok");
                }else{
                    callback(response)
                }
            }else{
                failureCallback("Can't parse JSON response");
            }
        }
    });
}

