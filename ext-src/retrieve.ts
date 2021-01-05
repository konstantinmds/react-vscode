// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as azdata from 'azdata';
import * as path from 'path';
import * as fs from 'fs';


class Package {
    public id!: string;
    public package_name!: string;

    public getId(): string {
        return this.id;
    }

    public setId(id: string) {
        this.id = id;
    }
    public getPackageName(): string {
        return this.package_name;
    }

    public setPackageName(v: string) {
        this.package_name = v;
    }
}

interface Idbconfig {
    serverName: string,
    databaseName: string
}

class Packages {
    public packages: Array < Package > ;

    constructor() {
        this.packages = new Array < Package > ();
    }

    public addPackage(pckge: Package): void {
        this.packages.push(pckge);
    }

    public getPackageName(name: string): Package | void {
        this.packages.forEach(element => {
            if (name === element.package_name) {
                return element;
            }
        });
    }

    public getPackageId(name: string): string {
        for (let index = 0; index < this.packages.length; index++) {
            const element = this.packages[index];
            if (name === element.package_name) {
                return element.id;
            }
        }
        return '';
    }
}

export class RetrieveDialog {

    private connections: azdata.connection.ConnectionProfile[] = [];
    private connection: azdata.connection.ConnectionProfile = new azdata.connection.ConnectionProfile;
    private project: string;
    private engineType: string;
    private projectNames: string;
    private packagesMap = new Packages();
    private selectedPackage!: string;
    private databaseName: string;
    private checkBoxList: Array < string > ;
    private checkBoxesMap: any;
    private packageDropdown: azdata.DropDownComponent;
    private projectEnvsDropdown: azdata.DropDownComponent;
    private templateGroups: azdata.DropDownComponent;
    private selectedTemplate: string;

    private original_package_list: string[]
    private sourceQueryRadioBtn: azdata.RadioButtonComponent;
    private foreachQueryRadioBtn: azdata.RadioButtonComponent;
    private dbConfigObje :Idbconfig;

    private packageQueryColumnMap: Map < string, string > ;
    private projectIdsMap: Map < string, string > ;
    private selectedEnvironment: string;
    private environments: string[];
    private vsPath: string;

    private packageDefinitionsELT = new Map < string, Array < string >> ([
        ['Execute SQL', [`SELECT package_name FROM [elt].[package_config_execute_sql]`, `[elt].[package_config_execute_sql]`]],
        ['Data Flow', [`SELECT package_name FROM [elt].[package_config_data_flow]`, `[elt].[package_config_data_flow]`]],
        ['Foreach SQL', [`SELECT package_name FROM [elt].[package_config_foreach_execute_sql]`, `[elt].[package_config_foreach_execute_sql]`]],
        ['Foreach Data Flow', [`SELECT package_name FROM [elt].[package_config_foreach_data_flow]`, `[elt].[package_config_foreach_data_flow]`]]
    ]);


    private dialog: azdata.window.Dialog;


    constructor(engineType = "eltSnap", openDialog=true) {
        this.engineType = engineType;
        this.getConnections();
        this.projectIdsMap = new Map();
        if (openDialog) {
            this.openDialog(this.engineType);
        
            
            this.project = '';
            this.projectNames='';
            this.databaseName = '';
            this.checkBoxList = [];
            this.original_package_list = [];
            this.dbConfigObje;
            this.checkBoxesMap = {
                ExecuteProcess: false,
                DataFlow: true,
                ForEachSQL: true,
                ExecuteSQL: true,
                ForEachDataFlow: true
            };
            this.packageQueryColumnMap = new Map();
            this.packageQueryColumnMap.set("Execute SQL", "[query]");
            this.packageQueryColumnMap.set("Data Flow", "[src_query]");
            this.packageQueryColumnMap.set("Foreach Execute SQL", "[foreach_query_expr]");
            this.packageQueryColumnMap.set("Foreach Data Flow", "[foreach_query_expr]");
            
            this.vsPath = '';
        }
    }

    /**
     * Altering user configuring snippets
     * Generating parameters snippets
     */

    private async generatePyJSON(connectionId) : Promise<void> {

        const userPathSnippet = path.join(process.env.APPDATA, '/azuredatastudio/User/snippets/python.json');
        //let modulePath = path.join(__dirname, '//..//pythonFiles');      


        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > ("MSSQL", azdata.DataProviderType.QueryProvider);

        //queries 
        let projectQuery : string = `SELECT [project_name] FROM [elt].[project]`;
        let providerCustomCSQueryCommand : string = `SELECT [connection_name], [server_name]
        , [database_name], [custom_connect_string], [provider] FROM [elt].[oledb_connection]`;
        let parameter_referenceCommand: string = `SELECT [parameter_reference] FROM [elt].[parameter] WHERE parameter_type= 'Directory'`;
        let allPackagesCommand = ` SELECT [package_name] FROM [elt].[vw_packages]`;
        let environmentsQuery = `SELECT [environment_name], [build_template_group] FROM [elt].[environment]`

        let defaultUri = await azdata.connection.getUriForConnection(connectionId);
        try {
            let result = await provider.runQueryAndReturn(defaultUri, projectQuery);    
            let projects: string [] = [];
            for (let index = 0; index < result.rows.length; index++) {
                projects.push(result.rows[index][0].displayValue);
    
            }      

            let allPackages = await provider.runQueryAndReturn(defaultUri, allPackagesCommand);
            var allPakcagesList =allPackages.rows.map(v=> v[0]['displayValue'])

            this.projectNames = projects.join("','");
            var project_names_ = projects.join(',');
    

            var packagesDataFlow = (allPackages.rows.map(v => v[0]['displayValue']).filter(v=> v.includes("Data Flow") && !v.includes("Foreach")));
            var packagesExecuteProc = allPackages.rows.map(v => v[0]['displayValue']).filter(c => c.includes("Execute Process"));
            var packagesExecuteSQL = allPackages.rows.map(v => v[0]['displayValue']).filter(c => c.includes("Execute SQL") && !c.includes("Foreach"));
            var packagesForeachDataFlow = allPackages.rows.map(v => v[0]['displayValue']).filter(c => c.includes("Foreach Data Flow"));
            var packagesForeachExecuteSQL = allPackages.rows.map(v => v[0]['displayValue']).filter(c => c.includes("Foreach Execute SQL"));


            let resultCustConn = await provider.runQueryAndReturn(defaultUri, providerCustomCSQueryCommand); 
            let parameter_references_ = await provider.runQueryAndReturn(defaultUri, parameter_referenceCommand); 
            

            var parameter_references = parameter_references_.rows.map(param => param[0]['displayValue']);
            var connection_names = resultCustConn.rows.map(row=> row[0]['displayValue']).filter((v, i, a) => a.indexOf(v) === i);   
            let curent_con_string = resultCustConn.rows.map(row=> row[3]['displayValue']).filter((v, i, a) => a.indexOf(v) === i && v!=="");
            var curent_con_string_list = curent_con_string.join("','");
            var provider_list = resultCustConn.rows.map(row=> row[4]['displayValue']).filter((v, i, a) => a.indexOf(v) === i);
            var server_names = resultCustConn.rows.map(row =>row[1]['displayValue']).filter((v, i, a) => a.indexOf(v) === i);
            var database_names = resultCustConn.rows.map(row =>row[2]['displayValue']).filter((v, i, a) => a.indexOf(v) === i);


            let allEnvsResultSet = await provider.runQueryAndReturn(defaultUri, environmentsQuery);
            var environments = allEnvsResultSet.rows.map(row => row[0]['displayValue']);



        } catch (error) {
                console.log(error);
            }

        try {
            var pyVSpath = path.join(this.vsPath, 'python.json');
            } catch (error) {
                
            }
    

        var pyUserSnippets: any = {};

        var VSpyUserSnippets: any = {};

        try {
            var file_ = fs.readFileSync(userPathSnippet);
            pyUserSnippets = JSON.parse(file_.toString());
        } catch (error) {
        }

        try {
            let file = fs.readFileSync(pyVSpath);
            VSpyUserSnippets = JSON.parse(file.toString());
        } catch (error) {
        }

        


        // generate HTML report snippet
        try {
    
            let pyCreateProjectSnippetName = "PyEltSnapGenerateHTML";
            let pycriptCreateSnippet =
            `from eltsnap.eltProject import *\ngenerate_html_report('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}')`;
    
            pyUserSnippets[pyCreateProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCreateProjectSnippetName].prefix =pyCreateProjectSnippetName;
            pyUserSnippets[pyCreateProjectSnippetName].body = pycriptCreateSnippet;
            pyUserSnippets[pyCreateProjectSnippetName].description = 'generate HTML report on the database level with python snippet fuction';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }

        //runtime command eltsnap
        try {

            let pyCreateRuntimeCommand = "PyEltSnapRuntimeCommand";
            let server_name = `$`+`{1|${this.dbConfigObje.serverName},${server_names}|}`;
            let database_name = `$`+`{2|${this.dbConfigObje.databaseName},${database_names}|}`;
            let project_name = `$`+`{3|project name, ${project_names_}|}`;
            let environment = `$`+`{4|"", ${environments}|}`;

            let template_group = `$`+ `{2|Framework Logging,No Framework,Framework Logging with Alert Emails,Framework Logging with Alerts and Informational Emails|}`;
            let pycriptCreateSnippet =
            `eltsnap_runtime_v2 -server "${server_name}" -database "${database_name}" -project "${project_name}" -environment "${environment}"`
    
            pyUserSnippets[pyCreateRuntimeCommand] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCreateRuntimeCommand].prefix =pyCreateRuntimeCommand;
            pyUserSnippets[pyCreateRuntimeCommand].body = pycriptCreateSnippet;
            pyUserSnippets[pyCreateRuntimeCommand].description = 'runtime command python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }
        
        //create project with python snippet
        try {
    
            let pyCreateProjectSnippetName = "PyEltSnapCreateProject";
            let choose_project_name = `$`+`{1:project name}`;
            let template_group = `$`+ `{2|Framework Logging,No Framework,Framework Logging with Alert Emails,Framework Logging with Alerts and Informational Emails|}`;
            let pycriptCreateSnippet =
            `from eltsnap.eltProject import *\ncreate_project('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', '${choose_project_name}', '${template_group}')`;
    
            pyUserSnippets[pyCreateProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCreateProjectSnippetName].prefix =pyCreateProjectSnippetName;
            pyUserSnippets[pyCreateProjectSnippetName].body = pycriptCreateSnippet;
            pyUserSnippets[pyCreateProjectSnippetName].description = 'create project with python snippet fuction';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }

                //rename project with python snippet
        try {
    
            let pyRenameProjectSnippetName = "PyEltSnapRenameProject";
            let project_names = `$`+`{1|'${this.projectNames}'|}`;
            let choose_project_name = `$`+`{2:new project name}`;

            let pycriptCreateSnippet =
            `from eltsnap.eltProject import *\nrename_project('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', ${project_names}, '${choose_project_name}')`;
    
            pyUserSnippets[pyRenameProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyRenameProjectSnippetName].prefix =pyRenameProjectSnippetName;
            pyUserSnippets[pyRenameProjectSnippetName].body = pycriptCreateSnippet;
            pyUserSnippets[pyRenameProjectSnippetName].description = 'rename project with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }


        //delete project with python snippet
        try {
            let pyDeleteProjectSnippetName = "PyEltSnapDeleteProject";
            pyUserSnippets[pyDeleteProjectSnippetName]= {};  
            let project_names = `$`+`{1|'${this.projectNames}'|}`;
            let pyScriptDeleteSnippet =
            `from eltsnap.eltProject import *\ndelete_project('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', ${project_names})`;
    
            pyUserSnippets[pyDeleteProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
    
            pyUserSnippets[pyDeleteProjectSnippetName].prefix =pyDeleteProjectSnippetName;
            pyUserSnippets[pyDeleteProjectSnippetName].body = pyScriptDeleteSnippet;
            pyUserSnippets[pyDeleteProjectSnippetName].description = 'delete project with python snippet function';           
        }
        catch (error) {
            let m = error;
            console.log(m);            
        }


        //clone project by name with python snippet
        try {
            let pyCloneProjectSnippetName = "PyEltSnapCloneProject";
            let choose_project_name = `$`+`{1|'${this.projectNames}'|}`;
            let enterProjectName = `$`+ `{2:new project name}`;
            let pycriptCloneSnippet =
            `from eltsnap.eltProject import *\nclone_project('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', ${choose_project_name}, '${enterProjectName}')`;
            pyUserSnippets[pyCloneProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCloneProjectSnippetName].prefix =pyCloneProjectSnippetName;
            pyUserSnippets[pyCloneProjectSnippetName].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneProjectSnippetName].description = 'clone project with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }

        
        //rename projects template group by name with python snippet
        try {
            let pyCloneProjectSnippetName = "PyEltSnapChangeTemplateGroup";
            let choose_project_name = `$`+`{1|'${this.projectNames}'|}`;
            let template_group = `$`+ `{2|Framework Logging,No Framework,Framework Logging with Alert Emails,Framework Logging with Alerts and Informational Emails|}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltProject import *\nchange_project_template('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', ${choose_project_name}, '${template_group}')`;
            pyUserSnippets[pyCloneProjectSnippetName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCloneProjectSnippetName].prefix =pyCloneProjectSnippetName;
            pyUserSnippets[pyCloneProjectSnippetName].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneProjectSnippetName].description = 'rename projects template group with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }
          
    


        //save connection by name with python snippet
        try {
            let pySaveConnectionName = "PyEltSnapCreateDataConnection";
            let choose_project_name = `$`+`{5|'enter project name (optional)', '${this.projectNames}'|}`;
            let connection_name_to_save = `$`+ `{1:connection name}`;
            let server_name_to_save = `$`+ `{2:server name}`;
            let database_name_to_save = `$`+ `{3:database name}`;
            let provider_name_to_save = `$`+ `{4|${provider_list}|}`;
            let connection_string = `$`+ `{6|'custom connection string (optional)', '${curent_con_string_list}'|}`;


            let pycriptCloneSnippet =
            `from eltsnap.eltProject import *\ncreate_data_connection('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}',\n'${connection_name_to_save}', \n'${server_name_to_save}', \n'${database_name_to_save}', \n'${provider_name_to_save}',\n${choose_project_name}, \n${connection_string})`;
            pyUserSnippets[pySaveConnectionName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pySaveConnectionName].prefix =pySaveConnectionName;
            pyUserSnippets[pySaveConnectionName].body = pycriptCloneSnippet;
            pyUserSnippets[pySaveConnectionName].description = 'create new connection with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }
        
        //clone connection by name with python snippet
        try {
            let pyCloneConnectionName = "PyEltSnapCloneDataConnection";
            let choose_project_name = `$`+`{3|'enter project name (optional)','${this.projectNames}'|}`;
            let old_connection_name = `$`+ `{1|old connection name, ${connection_names}|}`;
            let connection_name_to_save = `$`+ `{2:new connection name}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltProject import *\nclone_data_connection('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', '${old_connection_name}', '${connection_name_to_save}', ${choose_project_name})`;
            pyUserSnippets[pyCloneConnectionName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCloneConnectionName].prefix =pyCloneConnectionName;
            pyUserSnippets[pyCloneConnectionName].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneConnectionName].description = 'clone existing connection with python snippet fuction';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }

        //delete connection by name with python snippet
        try {
            let pyCloneConnectionName = "PyEltSnapDeleteDataConnection";
            //let choose_project_name = `$`+`{4|choose_project_name__to_delete_from_or_leave_blanc,' ', ${this.projectNames}|}`;
            let connection_name_to_delete = `$`+ `{1|${connection_names}|}`;


            let pycriptCloneSnippet =
            `from eltsnap.eltProject import *\ndelete_data_connection('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', '${connection_name_to_delete}')`;
            pyUserSnippets[pyCloneConnectionName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCloneConnectionName].prefix =pyCloneConnectionName;
            pyUserSnippets[pyCloneConnectionName].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneConnectionName].description = 'delete connection with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   


        //create DataFlow Package with python snippet
        //EXEC [elt].[Save Data Flow Package] 'connection', 'query', 0, 'package_qualifier', 'destination_connection', 'destination_schema', 'destination_table', 0, 0

        try {
            let pycreateDataFlow = "PyEltSnapCreateDataFlowPackage";
            //let choose_project_name = `$`+`{4|choose_project_name__to_delete_from_or_leave_blanc,' ', ${this.projectNames}|}`;
            let connection_name_source = `$`+ `{1|source_connection,${connection_names}|}`;
            let query = `$`+ `{2: \\* source query *\\ }`;
            let is_expression =  `$`+ `{3|is_expression(default 0),1|}`;
            let package_qualifier =  `$`+ `{4:package_qualifier}`;
            let destination_connection = `$`+ `{5|destination_connection,${connection_names}|}`;
            let destination_schema =  `$`+ `{6:destination_schema}`;
            let destination_table =  `$`+ `{7:destination_table}`;
            let destination_truncate =  `$`+ `{8|destination truncate default(0),1|}`;
            let keep_identity =  `$`+ `{9|keep identity default(0),1|}`;
            let use_bulk_copy =  `$`+ `{10|use bulk copy default(0),1|}`;
            let project_id =  `$`+ `{11|project_context default(0),${project_names_}|}`;     
            let batch_size =  `$`+ `{12:batch size default(0)}`;
            

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ncreate_dataflow_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', \n'${connection_name_source}', \n'${query}', \n'${is_expression}', \n'${package_qualifier}', \n'${destination_connection}', \n'${destination_schema}', \n'${destination_table}', \n'${destination_truncate}', \n'${keep_identity}', \n'${use_bulk_copy}',  \n'${project_id}', \n'${batch_size}')`;
               
            pyUserSnippets[pycreateDataFlow] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pycreateDataFlow].prefix =pycreateDataFlow;
            pyUserSnippets[pycreateDataFlow].body = pycriptCloneSnippet;
            pyUserSnippets[pycreateDataFlow].description = 'create data flow package with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   


        //clone DataFlow Package Package with python snippet
        //EXEC [elt].[Save Execute SQL Package] 'foreach connection', 'connection', 'foreach query', 'query', 'package_qualifier', 0, 0

        try {
            let pyCloneDataFlow = "PyEltSnapCloneDataFlowPackage";

            let project_names = `$`+`{1|${packagesDataFlow}|}`;
            let package_qualifier =  `$`+ `{2:new package qualifier}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\nclone_dataflow_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${project_names}', '${package_qualifier}')`;
           
            pyUserSnippets[pyCloneDataFlow] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    

            pyUserSnippets[pyCloneDataFlow].prefix =pyCloneDataFlow;
            pyUserSnippets[pyCloneDataFlow].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneDataFlow].description = 'clone Data Flow Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   



                //create FOREACHDataFlow Package with python snippet
        //EXEC [elt].[Save Data Flow Package] 'connection', 'query', 0, 'package_qualifier', 'destination_connection', 'destination_schema', 'destination_table', 0, 0

        try {
            let pyCloneForeachDataFlow = "PyEltSnapCreateForeachDataFlowPackage";

            let foreach_connection = `$`+ `{1|foreach_connection,${connection_names}|}`;
            let connection_name_source = `$`+ `{2|source_connection,${connection_names},'@[User::Item]|}`;
            let foreach_query = `$`+ `{3: \\* foreach query *\\ }`;    
            let query = `$`+ `{4: \\* source query *\\ }`;
            let package_qualifier =  `$`+ `{5:package_qualifier}`;
            let destination_connection = `$`+ `{6|destination_connection,${connection_names}|}`;
            let destination_schema =  `$`+ `{7:destination_schema}`;
            let destination_table =  `$`+ `{8:destination_table}`;
            let destination_truncate =  `$`+ `{9|destination truncate default(0),1|}`;
            let keep_identity =  `$`+ `{10|keep identity default(0),1|}`;
            let use_bulk_copy =  `$`+ `{11|use bulk copy default(0),1|}`;
            let project_id =  `$`+ `{12|project_context default(0),${project_names_}|}`;
            let batch_size =  `$`+ `{13|batch size default(0)|}`;
            

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ncreate_foreach_dataflow_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', \n'${foreach_connection}', \n'${connection_name_source}', \n'${foreach_query}', \n'${query}', \n'${package_qualifier}', \n'${destination_connection}', \n'${destination_schema}', \n'${destination_table}', \n'${destination_truncate}', \n'${keep_identity}', \n'${use_bulk_copy}', \n'${project_id}', \n'${batch_size}')`;
               
            pyUserSnippets[pyCloneForeachDataFlow] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCloneForeachDataFlow].prefix =pyCloneForeachDataFlow;
            pyUserSnippets[pyCloneForeachDataFlow].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneForeachDataFlow].description = 'create foreach data flow package with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   


        //clone Foreach DataFlow Package with python snippet
        //EXEC [elt].[Save Execute SQL Package] 'foreach connection', 'connection', 'foreach query', 'query', 'package_qualifier', 0, 0

        try {
            let pyCloneConnectionName = "PyEltSnapCloneForeachDataFlowPackage";

            let project_names = `$`+`{1|${packagesForeachDataFlow}|}`;
            let package_qualifier =  `$`+ `{2:new package qualifier}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\nclone_foreach_dataflow_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${project_names}', '${package_qualifier}')`;
           
            
            pyUserSnippets[pyCloneConnectionName] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };

           
            pyUserSnippets[pyCloneConnectionName].prefix =pyCloneConnectionName;
            pyUserSnippets[pyCloneConnectionName].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneConnectionName].description = 'clone Foreach Data Flow Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   



        //create Execute Process Package with python snippet
        //EXEC [elt].[Save Execute Process Package] 'package_qualifier', 'executable expression', 'arguments expession', 'working directory', 0, 'package name', 'old package name'

        try {
            let pyCreateExecuteProcess = "PyEltSnapCreateExecuteProcessPackage";

            let package_qualifier =  `$`+ `{1:package_qualifier}`;
            let executable_expression =  `$`+ `{2:executable expression}`;
            let arguments_expession =  `$`+ `{3:arguments expession}`;
            let working_directory =  `$`+ `{4|working_directory,default,${parameter_references}|}`;
            let place_values_in_ELT_Data =  `$`+ `{5|place values in ELT_Data default(0),1|}`;
            let project_id =  `$`+ `{6|project_context default(0),${project_names_}|}`;


            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ncreate_execute_process_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', \n'${package_qualifier}', \n'${executable_expression}', \n'${arguments_expession}', \n'${working_directory}', \n'${place_values_in_ELT_Data}', \n'${project_id}')`;
               
            pyUserSnippets[pyCreateExecuteProcess] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCreateExecuteProcess].prefix =pyCreateExecuteProcess;
            pyUserSnippets[pyCreateExecuteProcess].body = pycriptCloneSnippet;
            pyUserSnippets[pyCreateExecuteProcess].description = 'create Execute Process package with python snippet function';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   

        //clone Execute Process Package with python snippet
        try {
            let pyCloneExecuteProcess = "PyEltSnapCloneExecuteProcessPackage";

            let project_names = `$`+`{1|${packagesExecuteProc}|}`;
            let package_qualifier =  `$`+ `{2:new package qualifier}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\nclone_execute_process_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${project_names}', '${package_qualifier}')`;
           
            pyUserSnippets[pyCloneExecuteProcess] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };

           
            pyUserSnippets[pyCloneExecuteProcess].prefix =pyCloneExecuteProcess;
            pyUserSnippets[pyCloneExecuteProcess].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneExecuteProcess].description = 'clone Execute Process Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   



        //create Execute SQL Package with python snippet
        //EXEC [elt].[Save Execute SQL Package] 'foreach connection', 'connection', 'foreach query', 'query', 'package_qualifier', 0, 0

        try {
            let pyCreateExecuteSQL = "PyEltSnapCreateExecuteSQLPackage";

            let package_qualifier =  `$`+ `{3:package_qualifier}`;
            let connection_name_source = `$`+ `{1|source_connection_name, ${connection_names}|}`;
            let query = `$`+ `{2: \\* source query *\\ }`;
            let is_expression =  `$`+ `{4|is_expression(default 0),1|}`;
            let return_row_count =  `$`+ `{5|return row count(default 0), 1|}`;
            let project_id =  `$`+ `{6|project_context default(0),${project_names_}|}`;

            

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ncreate_execute_sql_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', \n'${connection_name_source}', \n'${query}', \n'${package_qualifier}', \n'${is_expression}', \n'${return_row_count}', \n'${project_id}')`;
           
                       
            pyUserSnippets[
                pyCreateExecuteSQL] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };

            
           
            pyUserSnippets[pyCreateExecuteSQL].prefix =pyCreateExecuteSQL;
            pyUserSnippets[pyCreateExecuteSQL].body = pycriptCloneSnippet;
            pyUserSnippets[pyCreateExecuteSQL].description = 'create Execute SQL Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   



                //clone Execute SQL Package with python snippet
        //EXEC [elt].[Save Execute SQL Package] 'foreach connection', 'connection', 'foreach query', 'query', 'package_qualifier', 0, 0

        try {
            let pyCloneExecuteSQL = "PyEltSnapCloneExecuteSQLPackage";

            let project_names = `$`+`{1|${packagesExecuteSQL}|}`;
            let package_qualifier =  `$`+ `{2:new package qualifier}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\nclone_execute_sql_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${project_names}', '${package_qualifier}')`;
           
            pyUserSnippets[pyCloneExecuteSQL] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };

           
            pyUserSnippets[pyCloneExecuteSQL].prefix = pyCloneExecuteSQL;
            pyUserSnippets[pyCloneExecuteSQL].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneExecuteSQL].description = 'clone Execute SQL Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   

        //create Foreach Execute SQL Package with python snippet
        //EXEC [elt].[Save Foreach Execute SQL Package] 'foreach connection', 'connection', 'foreach query', 'query', 'package_qualifier', 0, 0

        try {
            let pyCreateForeachExecuteSQL = "PyEltSnapCreateForeachExecuteSQLPackage";

            let foreach_connection = `$`+ `{1|foreach_connection,${connection_names}|}`;
            let connection_name_source = `$`+ `{2|source_connection_name,${connection_names},@[User::Item]|}`;
            let foreach_query = `$`+ `{3: \\* foreach query *\\ }`;    
            let query = `$`+ `{4: \\* source query *\\ }`;
            let package_qualifier =  `$`+ `{5:package_qualifier}`;
            let is_expression =  `$`+ `{6|is_expression(default 0),1|}`;
            let return_row_count =  `$`+ `{7|return row count(default 0),1|}`;
            let project_id =  `$`+ `{8|project_context default(0),${project_names_}|}`;

            

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ncreate_foreach_execute_sql_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}', \n'${foreach_connection}', \n'${connection_name_source}', \n'${foreach_query}', \n'${query}', \n'${package_qualifier}', \n'${is_expression}', \n'${return_row_count}', \n'${project_id}')`;
               
            pyUserSnippets[pyCreateForeachExecuteSQL] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
    
            pyUserSnippets[pyCreateForeachExecuteSQL].prefix =pyCreateForeachExecuteSQL;
            pyUserSnippets[pyCreateForeachExecuteSQL].body = pycriptCloneSnippet;
            pyUserSnippets[pyCreateForeachExecuteSQL].description = 'create Foreach Execute SQL Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   

        //clone Foreach Execute SQL Package with python snippet
        try {
            let pyCloneForeachExecuteSQL = "PyEltSnapCloneForeachExecuteSQLPackage";

            let project_names = `$`+`{1|${packagesForeachExecuteSQL}|}`;
            let package_qualifier =  `$`+ `{2:new package qualifier}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\nclone_foreach_execute_sql_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${project_names}', '${package_qualifier}')`;
            
            
            pyUserSnippets[pyCloneForeachExecuteSQL] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };

            pyUserSnippets[pyCloneForeachExecuteSQL].prefix =pyCloneForeachExecuteSQL;
            pyUserSnippets[pyCloneForeachExecuteSQL].body = pycriptCloneSnippet;
            pyUserSnippets[pyCloneForeachExecuteSQL].description = 'clone Foreach Execute SQL Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }   

        //delete Package with python snippet
        try {
            let pyDeleteForeachExecuteSQL = "PyEltSnapDeletePackage";
            let package_names = `$`+`{1|${allPakcagesList}|}`;

            let pycriptCloneSnippet =
            `from eltsnap.eltPackage import *\ndelete_package('${this.dbConfigObje.serverName}', '${this.dbConfigObje.databaseName}','${package_names}')`;
            

            pyUserSnippets[pyDeleteForeachExecuteSQL] = {
                'prefix': '',
                'body':'',
                'description': ''          
            };
                        
            pyUserSnippets[pyDeleteForeachExecuteSQL].prefix =pyDeleteForeachExecuteSQL;
            pyUserSnippets[pyDeleteForeachExecuteSQL].body = pycriptCloneSnippet;
            pyUserSnippets[pyDeleteForeachExecuteSQL].description = 'delete Package with python snippet';  
            
        } catch (error) {
            let m = error;
            console.log(m);            
        }        
        
        try {
            var userSnippetsPyS = JSON.stringify(pyUserSnippets);    
        } catch (error) {    
            console.log(error);
        }
        try {
            var userSnippetsPy = JSON.parse(userSnippetsPyS);
        } catch (error) {
            console.log(error);
        }



        
        fs.writeFile(userPathSnippet, JSON.stringify(userSnippetsPy, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.message);
                } else {
                    vscode.window.showInformationMessage('User snippets has been generated'); 
                }  
            
            });
        try {
            var concatedVS = {...VSpyUserSnippets, ...userSnippetsPy}

        } catch (error) {
        }

        fs.writeFile(pyVSpath, JSON.stringify(concatedVS, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.message);
                } else {
                    vscode.window.showInformationMessage('User snippets has been generated'); 
                }  
            });
        }
          
    private async generateParameterSnippets(connectionId=this.connection.connectionId): Promise < void >{
        const userPathSnippet = path.join(process.env.APPDATA, '/azuredatastudio/User/snippets/sql.json');

        
        let userSnippets: any = {};
        let result: azdata.SimpleExecuteResult;
        let operation: false;
        try {
            let file = fs.readFileSync(userPathSnippet);
            userSnippets = JSON.parse(file.toString());
        } catch (error) {
           console.log(error.message); 
        }

        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > ("MSSQL", azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(connectionId);

        try {
            let vscodePathQuery = `SELECT [use_value] FROM [elt].[application_config] where setting='path to snippets folder in vscode'`;
            let vscodePath = await provider.runQueryAndReturn(defaultUri, vscodePathQuery);
            this.vsPath = vscodePath.rows[0][0].displayValue
            } catch (error) {
                
            }




        var VSsqlUserSnippets: any = {};


        try {
            var VSsqlUserSnippets: any;
            var sqlVSpath = path.join(this.vsPath,'sql.json');    
            let file = fs.readFileSync(sqlVSpath);
            VSsqlUserSnippets = JSON.parse(file.toString());
        } catch (error) {
        }



    
        let parameterQuery : string = `SELECT [parameter_name],[parameter_value],[parameter_reference] FROM [elt].[parameter] where parameter_type='String'`;

        let dbConfigObjeCommand = `select db_name(), @@SERVERNAME`;


        try {
            result = await provider.runQueryAndReturn(defaultUri, parameterQuery);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }





        let dbConfigObj = await provider.runQueryAndReturn(defaultUri, dbConfigObjeCommand);
        this.dbConfigObje = {serverName : dbConfigObj.rows[0][1].displayValue, databaseName : dbConfigObj.rows[0][0].displayValue};
        

        
        for (let index = 0; index < result.rows.length; index++) {
            const name = result.rows[index][0].displayValue;
            const value = result.rows[index][1].displayValue;
            const reference = result.rows[index][2].displayValue;
            
            let nameTemplate = `eltSnapParam:${name}`;
            if(!userSnippets[name]) {
                userSnippets[name] = {
                    'prefix': '',
                    'body': '',
                    'description': ''
                };
            } 
            userSnippets[name].prefix = nameTemplate;
            userSnippets[name].body = `/*${reference}_begin*/'${value}'/*${reference}_end*/`;
            userSnippets[name].description = reference;
    
        }

        // Project snippets

        let projectQuery : string = `SELECT [project_name] FROM [elt].[project]`;
        result = await provider.runQueryAndReturn(defaultUri, projectQuery);

        let projects: string [] = [];

        for (let index = 0; index < result.rows.length; index++) {
            projects.push(result.rows[index][0].displayValue)

        }
        let projectNames = projects.join("','");
        // projectNames = '\'' + projectNames + '\''

        if(!userSnippets["Create Project"]) {
            userSnippets["Create Project"] = {
                'prefix': 'eltSnapSP:CreateProject',
                'body': "EXEC [elt].[Save Project] ('${1:project_name}',${2|'No Alert', 'Framework Logging', 'Framework Logging with Alert Emails', 'Framework Logging with Alerts and Informational Emails'|})",
                'description': 'Create new project'
            };
        }else{
            userSnippets["Create Project"].body = "EXEC [elt].[Save Project] ('${1:project_name}',${2|'No Alert', 'Framework Logging', 'Framework Logging with Alert Emails', 'Framework Logging with Alerts and Informational Emails'|})";
        }

        if(!userSnippets["Clone Project"]) {
            userSnippets["Clone Project"] = {
                'prefix': 'eltSnapSP:CloneProject',
                'body': "EXEC [elt].[Clone Project By Name] '${1|" + projectNames + "|}', '${2:project_name}'",
                'description': 'Clone project'
            };
        }else{
            userSnippets["Clone Project"].body = "EXEC [elt].[Clone Project By Name] '${1|" + projectNames + "|}', '${2:project_name}'";
        }

        if(!userSnippets["Delete Project"]) {
            userSnippets["Delete Project"] = {
                'prefix': 'eltSnapSP:DeleteProject',
                'body': "EXEC [elt].[Delete Project] ${1|'" + projectNames + "'|}",
                'description': 'Delete project'
            };
        }else{
            userSnippets["Delete Project"].body = "EXEC [elt].[Delete Project] ${1|'" + projectNames + "'|}";
        }

        

        fs.writeFile(userPathSnippet, JSON.stringify(userSnippets, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.message);
                vscode.window.showWarningMessage("Remove the comments from the json file");

            } else {
                vscode.window.showInformationMessage('User snippets has been generated'); 
            }
          });

          try {
            var concatedVS = {...VSsqlUserSnippets, ...userSnippets}

        } catch (error) {
        }

         fs.writeFile(sqlVSpath, JSON.stringify(concatedVS, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.message);
                } else {
                    vscode.window.showInformationMessage('User snippets has been generated'); 
                }  
            
            });
            }

    private async getParameterValue(paramReference: string): Promise < string > {
        let paramValueQuery = `SELECT [parameter_value] FROM [elt].[parameter] where parameter_reference = '${paramReference}'`;
        if (this.engineType == 'bimlSnap') {
            paramValueQuery = `SELECT [parameter_value] FROM [biml].[parameter] where parameter_reference = '${paramReference}'`;
        }

        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);

        let result = await provider.runQueryAndReturn(defaultUri, paramValueQuery);
        if (result.rows.length > 0) {
            return result.rows[0][0].displayValue;
        } else {
            return 'NULL';
        }
    }


    private async resolveExpression(expression: string): Promise<string> {

        if (expression.startsWith('"')) {
            let queryParts = [];
            let quoteStrings = expression.split('"');

            for (let index = 0; index < quoteStrings.length; index++) {
                const element = quoteStrings[index];
                if (element) {
                    const result = element.match(/\@\[\$Project::(.*?)]/g)
                    if (result) {
                        let ref = result[0];
                        queryParts.push(ref);
                    } else {
                        queryParts.push(element);
                    }
                }

            }
            expression = queryParts.join('')
        }

        // Remove the parameters inside the single quote

        let regExpSingleQuote = /\'\@\[\$Project::(.*?)]\'/g;
        let quoteMatches = expression.match(regExpSingleQuote);

        if (quoteMatches) {
            for (let index = 0; index < quoteMatches.length; index++) {
                let ref = quoteMatches[index].substring(1, quoteMatches[index].length - 1)
                let val = await this.getParameterValue(ref);

                let value = `'${val}'`
                expression = expression.split(quoteMatches[index]).join(value);
            }
        }

        // Remove the parameters inside square brackets

        let regExpBrackets = /\[\@\[\$Project::(.*?)]\]/g;
        let bracketMatches = expression.match(regExpBrackets);

        if (bracketMatches) {
            for (let index = 0; index < bracketMatches.length; index++) {
                let ref = bracketMatches[index].substring(1, bracketMatches[index].length - 1)
                let val = await this.getParameterValue(ref);
                let value = `[${val}]`;
                expression = expression.split(bracketMatches[index]).join(value);
            }
        }

        // Remove the parameters that are alone / suitable for connection stein

        let regExp = /\@\[\$Project::(.*?)\]/g;
        let singleMatches = expression.match(regExp);

        if (singleMatches) {
            for (let index = 0; index < singleMatches.length; index++) {
                let val = await this.getParameterValue(singleMatches[index]);
                expression = expression.split(singleMatches[index]).join(val);
            }
        }
        return expression;
    }

    private async resolveQueryForEditor(query: string): Promise<string> {
        query = query.split('&quot;').join('"');
        query = query.split('&apos;').join('\'');
        query = query.split('‘&gt;').join('>');
        query = query.split('‘&lt;').join('<');

        if (query.startsWith('"')) {
            let queryParts = [];
            let quoteStrings = query.split('"');

            for (let index = 0; index < quoteStrings.length; index++) {
                const element = quoteStrings[index];
                
                if (element) {
                    const result = element.match(/\@\[\$Project::(.*?)]/g)
                    // Result User::Item
                    const resultUserItem = element.match(/\@\[User::Item]/g)

                    if (result) {
                        let ref = result[0];
                        queryParts.push(ref);

                    } else if(resultUserItem) {
                        let ref = resultUserItem[0];
                        queryParts.push(ref);
                    }else{
                        queryParts.push(element);
                    }
                }
            }
            query = queryParts.join('')
        }

        // Remove the parameters inside the single quote

        let regExpSingleQuote = /\'\@\[\$Project::(.*?)]\'/g;
        let quoteMatches = query.match(regExpSingleQuote);

        if (quoteMatches) {
            for (let index = 0; index < quoteMatches.length; index++) {
                let ref = quoteMatches[index].substring(1, quoteMatches[index].length - 1)
                let val = await this.getParameterValue(ref);

                val = `/*${ref}_begin*/'` + val + `'/*${ref}_end*/`
                query = query.split(quoteMatches[index]).join(val);
            }
        }

        // Remove the parameters inside square brackets

        let regExpBrackets = /\[\@\[\$Project::(.*?)]\]/g;
        let bracketMatches = query.match(regExpBrackets);

        if (bracketMatches) {
            for (let index = 0; index < bracketMatches.length; index++) {
                let ref = bracketMatches[index].substring(1, bracketMatches[index].length - 1)
                let val = await this.getParameterValue(ref);

                val = `/*${ref}_begin*/[` + val + `]/*${ref}_end*/`
                query = query.split(bracketMatches[index]).join(val);
            }
        }

        return query;
    }

    private async getEltsnapConnectionString(connName: string){
        let connString: string;
        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);
        let oleDbConnQuery = `SELECT     [server_name]
                                        ,[database_name]
                                        ,[provider]
                                        ,[custom_connect_string]
                                        ,[connection_expression]
                                    FROM [elt].[oledb_connection]
                                    WHERE [connection_name]='${connName}'`
        let result = await provider.runQueryAndReturn(defaultUri, oleDbConnQuery);

        if (result.rows) {
            // let serverName = result.rows[0][0].displayValue;
            // let databaseName = result.rows[0][1].displayValue;
            // let customConnectString = result.rows[0][3].displayValue;
            let connectionExpression = result.rows[0][4].displayValue;
            connString = await this.resolveExpression(connectionExpression);
        }
        return connString;
        
    }

    private async getQuery(engineType: string): Promise < void > {
        let selectQuery: string;
        let forEachDataFlowPackageQuery: string;
        var provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        var defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);

        if (!this.selectedPackage) {
            vscode.window.showWarningMessage('Please choose package');
            return
        }

        let activeEditor = vscode.window.activeTextEditor;
        let packageType = this.selectedPackage.split(' - ')[0];
        if (engineType === "eltSnap") {
            if(this.sourceQueryRadioBtn.checked && this.sourceQueryRadioBtn.enabled){
                selectQuery = `select [foreach_query_expr] from ${this.packageDefinitionsELT.get(packageType)![1]} where package_name='${this.selectedPackage}'`;
                forEachDataFlowPackageQuery = `SELECT [foreach_connection]
                                                    ,[foreach_query_expr]
                                                    ,[src_query_expr]
                                                FROM [elt].[package_config_foreach_data_flow]
                                                WHERE [package_name] = '${this.selectedPackage}'`

                let packageForEachDataFlow = await provider.runQueryAndReturn(defaultUri, forEachDataFlowPackageQuery);

                let forEachConn = packageForEachDataFlow.rows[0][0].displayValue;
                let forEachQueryExpr = packageForEachDataFlow.rows[0][1].displayValue;
                let srcQueryExpr = packageForEachDataFlow.rows[0][2].displayValue;

                let forEachConnString = await this.getEltsnapConnectionString(forEachConn);
                let forEachQuery = await this.resolveExpression(forEachQueryExpr);
                let srcQueryCommented = await this.resolveQueryForEditor(srcQueryExpr);

                // izbacen almirov ADODB i ubacena azdata funkcija
                
                try {
                    let forEachResult = await provider.runQueryAndReturn(defaultUri, forEachQuery);

                    for (let key in forEachResult[0]) {
                        let value = forEachResult[0][key];

                        let regExpBrackets = /\[\@\[User::Item\]\]/g;
                        let regExpQuotes = /\'\@\[User::Item\]\'/g;

                        let matchesBrackets = srcQueryCommented.match(regExpBrackets);
                        let matchesQuotes = srcQueryCommented.match(regExpQuotes);

                        if (matchesBrackets) {
                            for (let index = 0; index < matchesBrackets.length; index++) {
                                let valueWithRef = `/*@[User::Item]_begin*/\[${value}\]/*@[User::Item]_end*/`
                                srcQueryCommented = srcQueryCommented.split(matchesBrackets[index]).join(valueWithRef);
                            }
                        }

                        if (matchesQuotes) {
                            for (let index = 0; index < matchesQuotes.length; index++) {
                                let valueWithRef = `/*@[User::Item]_begin*/\'${value}\'/*@[User::Item]_end*/`
                                srcQueryCommented = srcQueryCommented.split(matchesQuotes[index]).join(valueWithRef);
                            }
                        }
                    }

                    if (activeEditor) {
                        activeEditor.edit(editBuilder => {
            
                            let queryWithName = `/*Package Name: ${this.selectedPackage} */ /*Source Query*/ \n${srcQueryCommented}`;
                            editBuilder.insert(activeEditor!.selection.active, queryWithName);
                        });
            
                        azdata.window.closeDialog(this.dialog);
                    } else {
                        vscode.window.showWarningMessage('Please open Active Editor');
                    }

                } catch (error) {
                    console.error(error);
                }

            }else{
                selectQuery = `select ${this.packageQueryColumnMap.get(packageType)} from ${this.packageDefinitionsELT.get(packageType)![1]} where package_name='${this.selectedPackage}'`;
            }
        } 
      
        if(!(this.sourceQueryRadioBtn.checked && this.sourceQueryRadioBtn.enabled)) {
            let result = await provider.runQueryAndReturn(defaultUri, selectQuery);

            let query = result.rows[0][0].displayValue;

            if (query.startsWith('"')) {
                let queryParts = [];
                let quoteStrings = query.split('"');

                for (let index = 0; index < quoteStrings.length; index++) {
                    const element = quoteStrings[index];
                    if (element) {
                        const result = element.match(/\@\[\$Project::(.*?)]/g)
                        if (result) {
                            let ref = result[0];
                            queryParts.push(ref);

                        } else {
                            queryParts.push(element);
                        }
                    }

                }
                query = queryParts.join('')
            }

            // Remove the parameters inside the single quote

            let regExpSingleQuote = /\'\@\[\$Project::(.*?)]\'/g;
            let quoteMatches = query.match(regExpSingleQuote);

            if (quoteMatches) {
                for (let index = 0; index < quoteMatches.length; index++) {
                    let ref = quoteMatches[index].substring(1, quoteMatches[index].length - 1)
                    let val = await this.getParameterValue(ref);

                    val = `/*${ref}_begin*/'` + val + `'/*${ref}_end*/`
                    query = query.split(quoteMatches[index]).join(val);
                }
            }

            // Remove the parameters inside square brackets

            let regExpBrackets = /\[\@\[\$Project::(.*?)]\]/g;
            let bracketMatches = query.match(regExpBrackets);

            if (bracketMatches) {
                for (let index = 0; index < bracketMatches.length; index++) {
                    let ref = bracketMatches[index].substring(1, bracketMatches[index].length - 1)
                    let val = await this.getParameterValue(ref);

                    val = `/*${ref}_begin*/[` + val + `]/*${ref}_end*/`
                    query = query.split(bracketMatches[index]).join(val);
                }
            }

            if (activeEditor) {
                activeEditor.edit(editBuilder => {

                    let queryWithName = `/*Package Name: ${this.selectedPackage} */ \n${query}`;
                    if (packageType == 'Foreach Data Flow') {
                        queryWithName = `/*Package Name: ${this.selectedPackage} */ /*Foreach query*/ \n${query}`; 
                    }
                    editBuilder.insert(activeEditor!.selection.active, queryWithName);
                });

                azdata.window.closeDialog(this.dialog);
            } else {
                vscode.window.showWarningMessage('Please open Active Editor');
            }
        }
        await this.generateParameterSnippets(this.connection.connectionId);
    }


    private async getProjectNames(databaseName: string, engineType: string): Promise < Array < string >> {
        if (engineType === "eltSnap") {
            var projectQuery: string = `select [project_id],[project_name] from [elt].[project]`;
        } 

        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);
        let data: any;
        try {
            data = await provider.runQueryAndReturn(defaultUri, projectQuery);

        } catch (error) {
            if (error.message == 'Query has no results to return') {
                vscode.window.showErrorMessage("The schema is not compatible with dialog type");
            } else {
                vscode.window.showErrorMessage(error.message); 
            }
            
            return;
        }


        let rows = data.rows;

        let values: Array < string > = [];

        rows.forEach(element => {
            let eltPackage = new Package();
            eltPackage.setId(element[0].displayValue);
            eltPackage.setPackageName(element[1].displayValue);
            let num = this.packagesMap;
            num.addPackage(eltPackage);
            values.push(element[1].displayValue);
            this.projectIdsMap.set(element[1].displayValue, element[0].displayValue)
        });
        return values;
    }

    public async getPackages(databaseName: string, engineType: string): Promise < string[] > {
        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);
        let projectId = this.packagesMap.getPackageId(this.project);
        if (engineType === "eltSnap") {
            if ((this.project === 'All Packages' || this.project === '') && projectId === '') {
                var query = `SELECT [package_name] FROM [elt].[project_package]`;
            } else if (this.project === 'No project packages') {
                query = `SELECT p.[package_name] FROM [elt].[vw_packages] p LEFT JOIN [elt].[project_package] pp
                         ON pp.[package_name] = p.[package_name] WHERE pp.[package_name] IS NULL`;
            } else {
                query = `SELECT [package_name] FROM [elt].[project_package] where project_id =${projectId}`;
            }
        } else if (engineType === "bimlSnap") {
            if ((this.project === 'All Packages' || this.project === '') && projectId === '') {
                var query = `SELECT [package_name] FROM [biml].[project_package]`;
            } else if (this.project === 'No project packages') {
                query = `SELECT p.[package_name] FROM [elt].[vw_packages] p LEFT JOIN [biml].[project_package] pp
                         ON pp.[package_name] = p.[package_name] WHERE pp.[package_name] IS NULL`;
            } else {
                query = `SELECT [package_name] FROM [biml].[project_package] where project_id =${projectId}`;
            }
        }

        let data: any;
        try {
            data = await provider.runQueryAndReturn(defaultUri, query);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        let rows = data.rows;
        let values: Array < string > = [];
        rows.forEach(row => values.push(row[0].displayValue));

        return values;
    }

    private async getConnections(): Promise < void > {
        let availableConnections = await azdata.connection.getConnections(true);
        let connections: azdata.connection.ConnectionProfile[] = [];
        availableConnections.forEach(element => {
            if (element.databaseName != "master" && element.databaseName != "model" && element.databaseName != "msdb" && element.databaseName != "tempdb") {
                connections.push(element);
            }
        });
        this.connections = connections;
    }

    private async setEnvironments(projectId:string): Promise<void> {
        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);

        let query: string = `SELECT [environment_name] FROM [elt].[project_environment] WHERE project_id =${projectId}`;
        let data: any;
        this.environments = [''];
        try {
            data = await provider.runQueryAndReturn(defaultUri, query);

            let rows = data.rows;
            rows.forEach(element => {
                this.environments.push(element[0].displayValue);
            });

        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }
        this.projectEnvsDropdown.values = this.environments;
    }

    private filterPackages(): string[] {

        let resultSet: string[] = [];
        resultSet.push('');

        let executeProcess = (() => {
            if (this.checkBoxesMap.ExecuteProcess) {
                let m = this.checkBoxList!.filter(pack => pack.includes("Execute Process"));
                return m
            } else {
                return []
            };
        })();
        let dataFlow = (() => {
            if (this.checkBoxesMap.DataFlow) {
                let m = this.checkBoxList!.filter(pack => pack.includes('Data Flow') && !pack.includes('Foreach'));
                return m
            } else {
                return []
            }
        })();
        let forEachSql = (() => {
            if (this.checkBoxesMap.ForEachSQL) {
                let m = this.checkBoxList!.filter(pack => pack.includes("Foreach Execute SQL"));
                return m
            } else {
                return []
            }
        })();
        let executeSQL = (() => {
            if (this.checkBoxesMap.ExecuteSQL) {
                let m = this.checkBoxList!.filter(pack => pack.includes('Execute SQL') && !pack.includes('Foreach'));
                return m
            } else {
                return []
            }
        })();
        let forEachDataFlow = (() => {
            if (this.checkBoxesMap.ForEachDataFlow) {
                let m = this.checkBoxList!.filter(pack => pack.includes('Foreach Data Flow'));
                return m
            } else {
                return []
            }
        })();
        var all: string[] = [];

        if (!this.checkBoxesMap.chB2 && !this.checkBoxesMap.DataFlow && !this.checkBoxesMap.ForEachSQL && !this.checkBoxesMap.ExecuteSQL &&
            !this.checkBoxesMap.ForEachDataFlow) {
            all = this.checkBoxList;
        }

        let allPackages = resultSet.concat(all, executeProcess, dataFlow, forEachSql, executeSQL, forEachDataFlow);
        return allPackages.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });


    }

    private openDialog(engineType: string): void {

        let dialogTitle: string = 'eltSnap Retrieve Query Dialog';
        if (engineType == 'bimlSnap') {
            dialogTitle = 'bimlSnap Retrieve Query Dialog';
        }

        this.dialog = azdata.window.createModelViewDialog(dialogTitle);
        let packagesTab = azdata.window.createTab('Retrieve Package');

        packagesTab.content = 'getpackage';
        this.dialog.content = [packagesTab];

        this.dialog.okButton.hidden = true;

        let retrieveButton = azdata.window.createButton('Load Query');
        retrieveButton.onClick(() => this.getQuery(engineType));

        this.dialog.customButtons = [retrieveButton];

        packagesTab.registerContent(async (view) => {
            await this.getTabContent(view, 400);
        });

        azdata.window.openDialog(this.dialog);
    }

    private async getTabContent(view: azdata.ModelView, componentWidth: number): Promise < void > {
        let connectionNames: string[] = [];
        connectionNames.push('');

        this.connections.forEach(element => {
            if (element.connectionName === '') {
                element.connectionName = element.databaseName + ' | ' + element.serverName;
                connectionNames.push(element.databaseName + ' | ' + element.serverName);

            } else {
                connectionNames.push(element.connectionName + ' | ' + element.serverName);
            }
        });

        let connectionDropdown = view.modelBuilder.dropDown().withProperties({
            value: '',
            values: connectionNames
        }).component();


        let projectNamesDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
        }).component();

        let ExecuteSQLCheckBox = view.modelBuilder.checkBox()
            .withProperties({
                label: 'Execute SQL'
            }).component();

        let DataFlowCheckBox = view.modelBuilder.checkBox()
            .withProperties({
                label: 'Data Flow'
            }).component();
        let ForeachExecuteSQLCheckBox = view.modelBuilder.checkBox()
            .withProperties({
                label: 'Foreach ExecuteSQL',
            }).component();
        let ForeachDataFlowCheckBox = view.modelBuilder.checkBox()
            .withProperties({
                label: 'Foreach Data Flow'
            }).component();
 
        DataFlowCheckBox.checked = true;
        ExecuteSQLCheckBox.checked = true;
        ForeachExecuteSQLCheckBox.checked = true;
        ForeachDataFlowCheckBox.checked = true;


        this.sourceQueryRadioBtn = view.modelBuilder.radioButton().withProperties({
            value:'source query',
            name: 'radio button option',
            label: "Source Query",
            checked: false,
            enabled: false
        }).component();

        this.foreachQueryRadioBtn = view.modelBuilder.radioButton()
        .withProperties({
            value: 'For each query',
            name: 'radioButtonOption 2',
            label: 'For each query',
            checked: false,
            enabled: false
        }).component();   
        
        let flexRadioButtonsModel = view.modelBuilder.flexContainer()
        .withLayout({
            flexFlow: 'row',
            height: 150
        }).withItems([
            this.sourceQueryRadioBtn, this.foreachQueryRadioBtn]
            , { flex: '1 1 50%' }).component();

        connectionDropdown.onValueChanged(value => {
            this.connections.forEach(element => {
                if ((element.connectionName + ' | ' + element.serverName === value.selected) || (element.connectionName === value.selected)) {
                    this.connection = element;

                    this.packageDropdown.values = [''];
                    projectNamesDropdown.values = [''];
                }
            });

            projectNamesDropdown.values = [''];
            projectNamesDropdown.value = '';

            this.databaseName = this.connection.databaseName;
            let projectNames = this.getProjectNames(this.databaseName, this.engineType);
            projectNames.then(result => {
                if (result) {
                    //result.unshift("All Packages");
                    result.unshift("");
                    result.push("No project packages");
                    projectNamesDropdown.values = result;

                }
            });

            projectNamesDropdown.value = '';
            this.project = ''

            this.getPackages(this.databaseName, this.engineType).then(result => {
                if (result) {
                    this.checkBoxList = result;
                    let packages = this.filterPackages();

                    this.packageDropdown.values = packages;
                }
            });



        });

        projectNamesDropdown.onValueChanged(value => {
            this.project = value.selected;
            this.getPackages(this.databaseName, this.engineType).then(result => {
                this.checkBoxList = result;
                let packages = this.filterPackages();

                this.original_package_list= this.packageDropdown.values = packages;
            });
        });

        
        DataFlowCheckBox.onChanged(e => {
            this.checkBoxesMap.DataFlow = !this.checkBoxesMap.DataFlow;

            this.packageDropdown.values = this.filterPackages();
        });

        ForeachExecuteSQLCheckBox.onChanged(e => {
            this.checkBoxesMap.ForEachSQL = !this.checkBoxesMap.ForEachSQL;

            this.packageDropdown.values = this.filterPackages();
        });
        

        ExecuteSQLCheckBox.onChanged(e => {
            this.checkBoxesMap.ExecuteSQL = !this.checkBoxesMap.ExecuteSQL;

            this.packageDropdown.values = this.filterPackages();
        });

        ForeachDataFlowCheckBox.onChanged(e => {
            this.checkBoxesMap.ForEachDataFlow = !this.checkBoxesMap.ForEachDataFlow;

            this.packageDropdown.values = this.filterPackages();
        });

        let search_bar = view.modelBuilder.inputBox().withProperties({
            placeHolder: "Search for package",
        }).component();

        search_bar.onTextChanged((text)=>{
            let packages_filter = this.original_package_list.filter(val => val.toLowerCase().includes(text.toLowerCase()));    
            this.packageDropdown.values = packages_filter;   
            this.packageDropdown.value='';     
        });
        this.packageDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
            heigth: 223,
        }).component();

        this.packageDropdown.onValueChanged(
            (value) => {
                this.selectedPackage = value.selected;
                if(this.selectedPackage.includes('Foreach',0))
                {
                    this.foreachQueryRadioBtn.enabled = true;
                    this.sourceQueryRadioBtn.enabled = true;
                    
                    this.sourceQueryRadioBtn.checked = true;
                    this.foreachQueryRadioBtn.checked = false;
                }
                else
                {
                    this.foreachQueryRadioBtn.enabled = false;
                    this.sourceQueryRadioBtn.enabled = false;

                    this.foreachQueryRadioBtn.checked = false;
                    this.sourceQueryRadioBtn.checked = false;
                }
            }
        );

        this.foreachQueryRadioBtn.onDidClick(()=>{
            this.sourceQueryRadioBtn.checked = false;
            this.foreachQueryRadioBtn.checked = true;
        })

        this.sourceQueryRadioBtn.onDidClick((value)=>{
            this.foreachQueryRadioBtn.checked=false;
            this.sourceQueryRadioBtn.checked=true;
        });

        let formPackageType = view.modelBuilder.groupContainer()
            .withLayout({}).withItems([
                DataFlowCheckBox, ExecuteSQLCheckBox, ForeachDataFlowCheckBox, ForeachExecuteSQLCheckBox
            ]).withProperties({
                horizontal: false,
            }).
        component();

        let formBuilder = view.modelBuilder.formContainer()
            .withFormItems(
                [{
                        component: connectionDropdown,
                        title: "Connection",
                    },
                    {
                        component: projectNamesDropdown,
                        title: "Project",
                    },
                    {
                        component: formPackageType,
                        title: "Package type",
                    },
                    {
                        component: search_bar,
                        title: "Package Search",
                    },

                    {
                        component: this.packageDropdown,
                        title: "Package"
                    },
                    {
                        component: flexRadioButtonsModel,
                        title: ' '
                    },
                ], {
                    horizontal: true,
                    componentWidth: 250,
                    titleFontSize: 11
                }).component();


        let groupModel1 = view.modelBuilder.groupContainer()
            .withLayout({}).withItems([formBuilder]).component();

        await view.initializeModel(groupModel1);

        if (this.connections.length == 1) {
            this.connection = this.connections[0];
            let connectionName = this.connection.connectionName + ' | ' + this.connection.serverName;
            connectionDropdown.value = connectionName;

            this.packageDropdown.values = [''];
            projectNamesDropdown.values = [''];

            this.databaseName = this.connection.databaseName;
            let projectNames = this.getProjectNames(this.databaseName, this.engineType);
            projectNames.then(result => {
                if (result) {
                  //  result.unshift("All Packages");
                    result.unshift("");
                    result.push("No project packages");

                    projectNamesDropdown.values = result;

                }
            });

            projectNamesDropdown.value = '';
            this.project = ''

            this.getPackages(this.databaseName, this.engineType).then(result => {
                if (result) {
                    this.checkBoxList = result;
                    let packages = this.filterPackages();

                    this.packageDropdown.values = packages;
                }
            });

        }
    }

    public async generateSnippets(): Promise<void> {
        // Make sure we have a connection (handle command palette vs. context menu entry points)
        await this.getConnections();
        // let connection: azdata.connection.Connection | azdata.connection.ConnectionProfile = await this.getConnectionFromUser();
        let connection: string = await this.getConnectionFromUser();
        this.generateParameterSnippets(connection);
        this.generatePyJSON(connection);
        
    }


    public async getHTMLreport()
    {
        await this.getConnections();
        // let connection: azdata.connection.Connection | azdata.connection.ConnectionProfile = await this.getConnectionFromUser();
        let connection: string = await this.getConnectionFromUser();

        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > ("MSSQL", azdata.DataProviderType.QueryProvider);
        let query = `select use_value from [elt].[application_config] where setting='path to html files location'`;
        let defaultUri = await azdata.connection.getUriForConnection(connection);

        try {
            var data = await provider.runQueryAndReturn(defaultUri, query);            
        } catch (error) {
            console.log(error)
            
        }
        let rows_group= data.rows;
        if (data.rowCount == 1) 
        {
            try {
                
                let path_ = path.join(rows_group[0][0]['displayValue'],'/eltSnap_Project_HTML.html');
                var opn = require('opn');
                // opens the url in the default browser 
                opn(path_);                
    
            } catch (error) {
                console.log(error)
                
            }
                    
        } else {
            console.log("The file first needs to be generated by the package !")
        }   
    }


    private async getConnectionFromUser(): Promise<string> {
        let options: any = [];
        // let value: azdata.connection.Connection | azdata.connection.ConnectionProfile;

        this.connections.forEach(element => {
            if (element.connectionName === '')
             {
                element.connectionName = element.databaseName + ' | ' + element.serverName;  
             }
            options.push(<ValuedQuickPickItem<string>>{ label: element.connectionName, value: element.connectionId })
        });
        let confirmedConnection: any = await vscode.window.showQuickPick(options, {
            placeHolder: `Pick connection to use`
        });

        return confirmedConnection.value;

    }

    public runPackage(engineType='eltsnap'): void{
        this.checkBoxesMap = {
            ExecuteProcess: true,
            DataFlow: true,
            ForEachSQL: true,
            ExecuteSQL: true,
            ForEachDataFlow: true
        };

        let dialogTitle: string = 'eltSnap Run Project Dialog';


        this.dialog = azdata.window.createModelViewDialog(dialogTitle);
        let runProjectTab = azdata.window.createTab('Run Project');

        runProjectTab.content = 'runProject';
        this.dialog.content = [runProjectTab];

        this.dialog.okButton.hidden = true;

        let runProjectBtn = azdata.window.createButton('Run Project');
        runProjectBtn.onClick(() => this.runProjectTerminal());

        this.dialog.customButtons = [runProjectBtn];

        runProjectTab.registerContent(async (view) => {
            await this.getRunProjectTabContent(view, 400);
        });

        azdata.window.openDialog(this.dialog);

    }

    private runProjectTerminal(): void {
        console.log(this.connection)
        console.log(this.project)
        console.log(this.selectedPackage)
        console.log(this.selectedTemplate)
        console.log(this.selectedEnvironment)

        if(!this.selectedPackage){this.selectedPackage = '';}
        if(!this.selectedTemplate){this.selectedTemplate = '';}
        if(!this.selectedEnvironment){this.selectedEnvironment = '';}

        let commandMap = {
            'packages': this.selectedPackage,
            'template': this.selectedTemplate,
            'environment': this.selectedEnvironment,
            'project': this.project
        }

        if(!this.project){
            vscode.window.showWarningMessage("Please choose project");
            return;
        }
        
        if (this.connection) {
            
            let server = this.connection.serverName;
            let database = this.connection.databaseName;
            let commandAutoGenerated = `eltsnap_runtime_v2 -server "${server}" -database "${database}" `

            for(let key in commandMap){
                let value = commandMap[key];
                if (value) {
                    commandAutoGenerated = `${commandAutoGenerated} -${key} "${value}"`
                }
            }

            // let command = `eltsnap_runtime_v2 -server "${server}" -database "${database}" -project "${this.project}" -environment "${this.selectedEnvironment}" -packages "${this.selectedPackage}" -template "${this.selectedEnvironment}"`;
            
            let activeTerminals = vscode.window.terminals;

            if(activeTerminals.length == 0){
                vscode.window.showWarningMessage("Please open cmd terminal");
            }else{
                const terminal = activeTerminals[0];

                terminal.sendText(commandAutoGenerated, false);
                vscode.env.clipboard.writeText(commandAutoGenerated);
                vscode.window.showInformationMessage("Command copied to the clipboard");
                azdata.window.closeDialog(this.dialog);
            }

        } else {
            vscode.window.showWarningMessage("Please choose connection");
        }
        
    }

    private async getRunProjectTabContent(view: azdata.ModelView, componentWidth: number): Promise < void > {
        let connectionNames: string[] = [];
        connectionNames.push('');

        this.connections.forEach(element => {
            if (element.connectionName === '') {
                element.connectionName = element.databaseName + ' | ' + element.serverName;
                connectionNames.push(element.databaseName + ' | ' + element.serverName);

            } else {
                connectionNames.push(element.connectionName + ' | ' + element.serverName);
            }
        });

        let connectionDropdown = view.modelBuilder.dropDown().withProperties({
            value: '',
            values: connectionNames
        }).component();


        let projectNamesDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
        }).component();

        this.projectEnvsDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
            values: this.environments
        }).component();

        this.templateGroups = view.modelBuilder.dropDown().withProperties({
            value: this.selectedTemplate,
            values: ['','No Framework', 'Framework Logging', 'Framework Logging with Alert Emails', 'Framework Logging with Alerts and Informational Emails']
        }).component();

        this.projectEnvsDropdown.onValueChanged( value => {
            this.selectedEnvironment = value.selected;
        });
        this.templateGroups.onValueChanged( value => {
            this.selectedTemplate = value.selected;
        });

  
        connectionDropdown.onValueChanged(value => {
            this.connections.forEach(element => {
                if ((element.connectionName + ' | ' + element.serverName === value.selected) || (element.connectionName === value.selected)) {
                    this.connection = element;

                    this.packageDropdown.values = [''];
                    projectNamesDropdown.values = [''];
                }
            });

            projectNamesDropdown.values = [''];
            projectNamesDropdown.value = '';

            this.databaseName = this.connection.databaseName;
            let projectNames = this.getProjectNames(this.databaseName, this.engineType);
            projectNames.then(result => {
                if (result) {
                    //result.unshift("All Packages");
                    result.unshift("");
                    result.push("No project packages");
                    projectNamesDropdown.values = result;

                }
            });

            projectNamesDropdown.value = '';
            this.project = ''


        });

        projectNamesDropdown.onValueChanged(value => {
            this.project = value.selected;
            this.setEnvironments(this.projectIdsMap.get(this.project));
            this.getPackages(this.databaseName, this.engineType).then(result => {
                this.checkBoxList = result;
                let packages = this.filterPackages();
                // this.packageDropdown.values = packages;
                this.original_package_list = this.packageDropdown.values = packages;
            });

        });

        
        this.packageDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
            heigth: 223,
        }).component();

        this.packageDropdown.onValueChanged(
            (value) => {
                this.selectedPackage = value.selected;

            }
        );

        let formBuilder = view.modelBuilder.formContainer()
            .withFormItems(
                [{
                        component: connectionDropdown,
                        title: "Connection",
                    },
                    {
                        component: projectNamesDropdown,
                        title: "Project",
                    },
                    {
                        component: this.packageDropdown,
                        title: "Package"
                    },
                    {
                        component: this.projectEnvsDropdown,
                        title: "Environment"
                    },
                    {
                        component: this.templateGroups,
                        title: "Template"
                    }
                ], {
                    horizontal: true,
                    componentWidth: 250,
                    titleFontSize: 11
                }).component();


        let tabComponents = view.modelBuilder.groupContainer()
            .withLayout({}).withItems([formBuilder]).component();

        await view.initializeModel(tabComponents);

        if (this.connections.length == 1) {
            this.connection = this.connections[0];
            let connectionName = this.connection.connectionName + ' | ' + this.connection.serverName;
            connectionDropdown.value = connectionName;

            this.packageDropdown.values = [''];
            projectNamesDropdown.values = [''];

            this.databaseName = this.connection.databaseName;
            let projectNames = this.getProjectNames(this.databaseName, this.engineType);
            projectNames.then(result => {
                if (result) {
                  //  result.unshift("All Packages");
                    result.unshift("");
                    result.push("No project packages");

                    projectNamesDropdown.values = result;

                }
            });

            projectNamesDropdown.value = '';
            this.project = ''

            this.getPackages(this.databaseName, this.engineType).then(result => {
                if (result) {
                    this.checkBoxList = result;
                    let packages = this.filterPackages();

                    this.packageDropdown.values = packages;
                }
            });

        }
    }
    
}

interface ValuedQuickPickItem<T> extends vscode.QuickPickItem {
    value: T;
}