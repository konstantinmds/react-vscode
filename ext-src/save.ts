'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as azdata from 'azdata';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();


// this method is called when your extension is deactivated
export function deactivate() {}

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


export class SaveDialog {

    private connections: azdata.connection.ConnectionProfile[] = [];
    private connection: azdata.connection.ConnectionProfile = new azdata.connection.ConnectionProfile;
    private project: string;
    private packagesMap = new Packages();
    private databaseName: string;
    private checkBoxList: Array < string > ;
    private allPackages: Array < string > ;
    private packageName: string;
    private packageQualifier: string;

    private packageNameFromEditor: string;

    private checkBoxesMap: any;
    private packageDropdown: azdata.DropDownComponent;
    private packageQueryColumnMap: Map < string, string > ;
    private packageToSave: string;
    private projectNames: Array < string > ;
    private returnRowCount: string;
    private sourceQueryIsExpression: string;
    private queryType: string;
    private isExpression: boolean = false;

    //constructor
    private engineType: string;
    private saveAsBiml: boolean;

    //UI blocks
    private dialog: azdata.window.Dialog;
    private updateTab: azdata.window.DialogTab;
    private saveTab: azdata.window.DialogTab;

    //Update Tab controls
    private UpdateQueryButton: azdata.ButtonComponent;

    //Save Tab controls
    private SaveQueryButton: azdata.ButtonComponent;
    private editStepButton: azdata.ButtonComponent;

    private packageDefinitions = new Map < string, Array < string >> ([
        ['Execute SQL', [`SELECT package_name FROM [elt].[package_config_execute_sql]`, `[elt].[package_config_execute_sql]`]],
        ['Data Flow', [`SELECT package_name FROM [elt].[package_config_data_flow]`, `[elt].[package_config_data_flow]`]],
        ['Foreach SQL', [`SELECT package_name FROM [elt].[package_config_foreach_execute_sql]`, `[elt].[package_config_foreach_execute_sql]`]],
        ['Foreach Data Flow', [`SELECT package_name FROM [elt].[package_config_foreach_data_flow]`, `[elt].[package_config_foreach_data_flow]`]]
    ]);

    private packageDefinitionsBimlsnap = new Map < string, Array < string >> ([
        ['Execute SQL', [`SELECT package_name FROM [biml].[package_config (Execute SQL)]`, `[biml].[package_config (Execute SQL)]`]],
        ['Data Flow', [`SELECT package_name FROM [biml].[package_config (Data Flow)]`, `[biml].[package_config (Data Flow)]`]],
        ['Foreach Data Flow', [`SELECT package_name FROM [biml].[package_config (Foreach Data Flow)]`, `[biml].[package_config (Foreach Data Flow)]`]]
    ]);

    private packageInsertDefitions = {
        'Execute SQL': '[elt].[package_config_execute_sql] ([connection_manager],[package_qualifier],[query],[is_expression],[return_row_count])'
    };

    private readonly SaveTheQueryButtonString: string = localize('SaveDialog.initializeSaveTab', "Save Query");
    private readonly UpdateTheQueryButtonString: string = localize('SaveDialog.initializeUpdateTab', "Update Query");
    private readonly BlankUpdatePackageError: string = localize('SaveDialog.initializeUpdateTab', "You can't update non-existing package!");
    private readonly ExistingSavePackageError: string = localize('SaveDialog.initializeSaveTab', " Can't make duplicate package!");
    private readonly NoSuchPackageError: string = localize('SaveDialog.initializeUpdateTab', " No such package in the database!");

    constructor(engineType = "eltSnap") {
        this.engineType = engineType;
        this.getConnections();
        this.openDialog(this.engineType);
        this.project = '';
        this.packageName = '';
        this.packageQualifier = '';
        this.databaseName = '';
        this.checkBoxList = [];
        this.allPackages = [];
        this.sourceQueryIsExpression = '0';
        this.returnRowCount = '0';
        this.saveAsBiml = false;

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
    }

    private parseQueryFromEditor(queryType: string = 'eltSnap'): string {
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            let query = activeEditor.document.getText();
            let bimlQuery: string;

            // Remove Package name
            let respond = query.split('\n');
            if (respond[0].includes('Package Name')) {
                query = respond.slice(1).join('\n');
                bimlQuery = respond.slice(1).join('\n');
                let regName = /\: (.*?) \*\//g
                let regQueryType = /\*\/ \/\*(.*?)\*\//g
                let queryTypeResult = respond[0].match(regQueryType)
                let result = respond[0].match(regName)
                if (result) {
                    this.packageNameFromEditor = result[0].slice(2, -2).trim();
                }
                if (queryTypeResult) {
                    let regexMatch = queryTypeResult[0].match(/\/\*(.*?)\*\//g);
                    this.queryType = regexMatch[0].slice(2, regexMatch[0].length - 2);
                }
            }

            let regParameterCommentsQuote = /\/\*\@\[\$Project::.*?\]_begin\*\/\'(.*?)\'\/\*\@\[\$Project::.*?]_end\*\//g
            let respondCommentsQuote = query.match(regParameterCommentsQuote)
            if (respondCommentsQuote) {
                this.isExpression = true;
                for (let element of respondCommentsQuote) {
                    const paramReference = element.match(/\@\[\$Project::(.*?)]/g);

                    if (paramReference) {
                        let referenceForReplace = paramReference[0];
                        query = query.replace(element, `'${referenceForReplace}'`);
                        bimlQuery = bimlQuery.replace(element, `'" + ${referenceForReplace} + "'`);
                    }
                }
            }

            // Replace the parameters with square brackets
            let regParameterCommentsBrackets = /\/\*\@\[\$Project::.*?\]_begin\*\/\[(.*?)\]\/\*\@\[\$Project::.*?]_end\*\//g
            let respondCommentsBrackets = query.match(regParameterCommentsBrackets)
            if (respondCommentsBrackets) {
                this.isExpression = true;
                for (let element of respondCommentsBrackets) {

                    const paramReference = element.match(/\@\[\$Project::(.*?)]/g)
                    if (paramReference) {
                        let referenceForReplace = paramReference[0];
                        query = query.replace(element, `[${referenceForReplace}]`);
                        bimlQuery = bimlQuery.replace(element, `[" + ${referenceForReplace} + "]`);
                    }
                }
            }

            // Replace the User::Item parameters with square brackets
            let regParameterUserBrackets = /\/\*\@\[User::Item\]_begin\*\/\[(.*?)\]\/\*\@\[User::Item]_end\*\//g
            let respondUserBrackets = query.match(regParameterUserBrackets)
            if (respondUserBrackets) {
                for (let element of respondUserBrackets) {

                    const paramReference = element.match(/\@\[User::Item]/g)
                    if (paramReference) {
                        let referenceForReplace = paramReference[0];
                        query = query.replace(element, `[${referenceForReplace}]`);
                        bimlQuery = bimlQuery.replace(element, `[" + ${referenceForReplace} + "]`);
                    }
                }
            }

            bimlQuery = `"${bimlQuery}"`

            if (queryType == 'bimlSnap') {
                return bimlQuery;
            } else {
                return query;
            }
        }
    }

    private async checkMergeQuery(packageName: string): Promise < boolean >{
        let mergeQueries: string[] = [`SELECT count (*) FROM [elt].[dim_table_merge_config] where [package_name] = '${packageName}'`,
                                        `SELECT count (*) FROM [elt].[fact_table_merge_config] where [package_name] = '${packageName}'`,
                                        `SELECT count (*) FROM [elt].[fact_table_partition_config] where [package_name] = '${packageName}'`,
                                        `SELECT count (*) FROM [elt].[fact_table_switch_config] where [package_name] = '${packageName}'`
                                    ]
        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);

        for (let index = 0; index < mergeQueries.length; index++) {
            const result = await provider.runQueryAndReturn(defaultUri, mergeQueries[index]);
            if(parseInt(result.rows[0][0].displayValue) > 0){
                return false;
            }
        }

        return true;
    }

    private async updateQuery(packageName: string): Promise < void > {
        let query: string;
        let updateQuery: string;
        
        if (this.engineType == 'eltSnap' && !this.saveAsBiml) {
            let checkQuery = await this.checkMergeQuery(packageName);
            if(!checkQuery){
                vscode.window.showWarningMessage('This query cannot be updated because is linked to a code generator');
                return;
            }

            query = this.parseQueryFromEditor();
        }
        if ((this.engineType == 'eltSnap' && this.saveAsBiml) || this.engineType == 'bimlSnap') {
            query = this.parseQueryFromEditor('bimlSnap');
        }

        if (query) {
            let packageType = packageName.split(' - ')[0];

            query = query.replace(/\'/g, '\'\'');

            if (packageType == 'Data Flow' || packageType == 'Execute SQL') {
                updateQuery = `UPDATE ${this.packageDefinitions.get(packageType)![1]} SET ${this.packageQueryColumnMap.get(packageType)}= '${query}', is_expression = '${this.isExpression}' WHERE [package_name]='${packageName}'`;
            } else {
                updateQuery = `UPDATE ${this.packageDefinitions.get(packageType)![1]} SET ${this.packageQueryColumnMap.get(packageType)}= '${query}' WHERE [package_name]='${packageName}'`;
            }

            if (this.queryType) {
                if ((this.queryType.toLowerCase() == 'source query')) {
                    updateQuery = `UPDATE ${this.packageDefinitions.get(packageType)![1]} SET [src_query_expr] = '${query}' WHERE [package_name]='${packageName}'`;
                }
            }

            if (this.engineType == 'bimlSnap') {

                if (packageType == 'Data Flow' || packageType == 'Execute SQL') {
                    updateQuery = `UPDATE ${this.packageDefinitionsBimlsnap.get(packageType)![1]} SET ${this.packageQueryColumnMap.get(packageType)}= '${query}', is_expression = '${this.isExpression}' WHERE [package_name]='${packageName}'`;
                } else {
                    updateQuery = `UPDATE ${this.packageDefinitionsBimlsnap.get(packageType)![1]} SET ${this.packageQueryColumnMap.get(packageType)}= '${query}' WHERE [package_name]='${packageName}'`;
                }

                // updateQuery = `UPDATE ${this.packageDefinitionsBimlsnap.get(packageType)![1]} SET ${this.packageQueryColumnMap.get(packageType)}= '${query}' WHERE [package_name]='${packageName}'`;
                
                if (this.queryType) {
                    if (this.queryType.toLowerCase() == 'source query') {
                        updateQuery = `UPDATE ${this.packageDefinitionsBimlsnap.get(packageType)![1]} SET [src_query_expr] = '${query}' WHERE [package_name]='${packageName}'`;
                    }
                }
            }

            let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
            let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);

            await provider.runQueryString(defaultUri, updateQuery);

            azdata.window.closeDialog(this.dialog);
            vscode.window.showInformationMessage('Package query successfully updated.');

        } else {
            vscode.window.showWarningMessage('Please open Active Editor');
        }
    }

    private async getProjectNames(databaseName: string): Promise < Array < string >> {
        let projectQuery: string = `select [project_id],[project_name] from [${databaseName}].[elt].[project]`;
        if (this.engineType == 'bimlSnap') {
            projectQuery = `select [project_id],[project_name] from [${databaseName}].[biml].[project]`;
        }

        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);
        let data: any;
        try {
            data = await provider.runQueryAndReturn(defaultUri, projectQuery);

        } catch (error) {
            vscode.window.showErrorMessage(error.message);
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
        });
        return values;
    }

    public async getPackages(databaseName: string, thisProject: string): Promise < string[] > {
        let provider: azdata.QueryProvider = azdata.dataprotocol.getProvider < azdata.QueryProvider > (this.connection.providerId, azdata.DataProviderType.QueryProvider);
        let defaultUri = await azdata.connection.getUriForConnection(this.connection.connectionId);
        //let projectId = this.packagesMap.getPackageId(thisProject);

        var query = `SELECT [package_name] FROM [${databaseName}].[elt].[vw_packages]`;
        if (this.engineType == 'bimlSnap') {
            query = `SELECT [package_name] FROM [${databaseName}].[biml].[project_package]`;
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

    private validateToSave(packageName: string, taskType: string): boolean {
        if (taskType === 'Save') {

            let valid = this.allPackages!.filter(pack => pack.includes(packageName));
            let le = valid.length;
            if (le === 0) {
                return true;
            }
            return false;

        } else if (taskType === "Update") {
            if (packageName === '') {
                return false;
            }
            return true;
        }
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
        let activeEditor = vscode.window.activeTextEditor;
        let query: string;
        if (activeEditor) {
            let dialogTitle: string = 'eltSnap Update Query Dialog';
            if (engineType == 'bimlSnap') {
                dialogTitle = 'bimlSnap Update Query Dialog';
            }

            this.dialog = azdata.window.createModelViewDialog(dialogTitle);
            this.updateTab = azdata.window.createTab('Update ');

            query = activeEditor.document.getText();
            let respond = query.split('\n');
            if (respond[0].includes('Package Name')) {
                query = respond.slice(1).join('\n');
                let regName = /\: (.*?) \*\//g
                let result = respond[0].match(regName)
                if (result) {
                    this.packageNameFromEditor = result[0].slice(2, -2).trim();
                }
            }
            this.dialog.content = [this.updateTab];
            this.dialog.okButton.hidden = true;
            let updateButton = azdata.window.createButton("Update");

            updateButton.onClick(() => this.validateToSave(this.packageName, 'Update') ? this.updateQuery(this.packageName) : this.dialog.message = {
                text: this.BlankUpdatePackageError
            })
            this.dialog.customButtons = [updateButton];
            this.updateTab.registerContent(async (view) => {
                await this.initializeUpdateTab(view, 400, engineType);
            });
            azdata.window.openDialog(this.dialog);
        } else {
            vscode.window.showInformationMessage("You have to open the Query Window");
        }
    }


    private async initializeUpdateTab(view: azdata.ModelView, componentWidth: number, engineType: string): Promise < void > {
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

        connectionDropdown.onValueChanged(value => {
            this.connections.forEach(element => {
                if (element.connectionName + ' | ' + element.serverName === value.selected) {
                    this.connection = element;
                    this.databaseName = element.databaseName;
                    this.packageDropdown.values = [''];
                }
            });

            this.getPackages(this.databaseName, this.project).then(result => {
                if (result) {
                    this.packageDropdown.editable = true;
                    this.checkBoxList = result;
                    this.allPackages = result;

                    this.packageDropdown.values = this.allPackages;

                    if (this.packageNameFromEditor && this.allPackages.includes(this.packageNameFromEditor)) {
                        this.packageDropdown.value = this.packageNameFromEditor;
                        this.packageName = this.packageNameFromEditor;
                        this.packageDropdown.enabled = false;
                    } else {
                        this.dialog.message = {
                            text: this.NoSuchPackageError
                        };
                    }                   
                }
            });
        });

        this.packageDropdown = view.modelBuilder.dropDown().withProperties({
            value: "",
        }).component();

        this.packageDropdown.onValueChanged(
            (value) => {
                this.packageName = value.selected;
            }
        )
        if (engineType === 'eltSnap') {
            var formBuilder = view.modelBuilder.formContainer()
                .withFormItems(
                    [{
                            component: connectionDropdown,
                            title: "Connection",
                        },
                        {
                            component: this.packageDropdown,
                            title: "Package"
                        }

                    ], {
                        horizontal: true,
                        componentWidth: 250,
                        titleFontSize: 11
                    }).component();

        } else if (engineType === "bimlSnap") {

            formBuilder = view.modelBuilder.formContainer()
                .withFormItems(
                    [{
                            component: connectionDropdown,
                            title: "Connection",
                        },
                        {
                            component: this.packageDropdown,
                            title: "Package"
                        }

                    ], {
                        horizontal: true,
                        componentWidth: 250,
                        titleFontSize: 11
                    }).component();
        }


        let groupModel1 = view.modelBuilder.groupContainer()
            .withLayout({}).withItems([formBuilder]).component();


        await view.initializeModel(groupModel1);


        if (this.connections.length == 1) {
            this.connection = this.connections[0];
            let connectionName = this.connection.connectionName + ' | ' + this.connection.serverName;
            connectionDropdown.value = connectionName;

            this.packageDropdown.values = [''];

            this.databaseName = this.connection.databaseName;
            let projectNames = this.getProjectNames(this.databaseName);
            projectNames.then(result => {
                if (result) {
                    result.unshift("Get All Packages");
                    result.unshift("No project packages");
                    result.unshift("");
                }
            });

            this.getPackages(this.databaseName, this.project).then(result => {
                if (result) {
                    this.checkBoxList = result;
                    this.allPackages = result;
                    let packages = this.filterPackages();

                    this.packageDropdown.values = packages;

                    if (this.packageNameFromEditor && packages.includes(this.packageNameFromEditor)) {
                        this.packageDropdown.value = this.packageNameFromEditor;
                        this.packageName = this.packageNameFromEditor;
                        this.packageDropdown.enabled = false;
                    } else {
                        this.dialog.message = {
                            text: this.NoSuchPackageError
                        };
                    }
                }
            });
        }
    }

}