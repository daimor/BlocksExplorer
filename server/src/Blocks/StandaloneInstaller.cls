Class Blocks.StandaloneInstaller Extends %Projection.AbstractProjection
{

Projection Reference As Blocks.StandaloneInstaller;

Parameter CSPAPP As %String = "/blocks";

Parameter CSPAPPDIR As %String = {##class(%File).SubDirectoryName($system.Util.InstallDirectory(), "csp"_$zcvt(..#CSPAPP,"l"), 1)};

Parameter CSPAPPDESC As %String = "A WEB application for Cache Blocks Explorer.";

Parameter ROUTER As %String = "Blocks.Router";

Parameter NAMESPACE As %String = "BLOCKS";

Parameter DBNAME As %String = "BLOCKS";

Parameter DBPATH As %String = {$zu(12,$zcvt(..#DBNAME,"l"))};

Parameter AUTOINSTALL As %Boolean = 0;

/// This method is invoked when a class is compiled.
ClassMethod CreateProjection(classname As %String, ByRef parameters As %String, modified As %String, qstruct) As %Status
{
    quit:'..#AUTOINSTALL $$$OK
    set xdata=##class(%Dictionary.XDataDefinition).%OpenId(..%ClassName(1)_"||Data",0)
    quit:'$isobject(xdata) $$$OK
    
    set logFile=##class(%File).TempFilename("setupBlocksExplorer")
    
    job ..setup():(:::logFile):0
    if '$test {
        quit $$$OK
    }
    set child=$zchild
    do { hang 0.1 } while $data(^$JOB(child)) 
    
    set fs=##class(%Stream.FileCharacter).%New()
    set fs.Filename=logFile
    while 'fs.AtEnd {
        write !,fs.ReadLine()
    }
    if ##class(%File).Delete(logFile)
    quit $$$OK
}

ClassMethod setup(ByRef pVars, pLogLevel As %Integer = 3, pInstaller As %Installer.Installer, pLogger As %Installer.AbstractLogger) As %Status [ CodeMode = objectgenerator, Internal ]
{
    do %code.WriteLine($c(9)_"if '$data(pVars(""FORCE"")) set pVars(""FORCE"")=$g(%qstruct(""force""))")
    do %code.WriteLine($c(9)_"set pVars(""CURRENTCLASS"")="""_%classname_"""")
    do %code.WriteLine($c(9)_"set pVars(""CURRENTNS"")=$namespace")
    do %code.WriteLine($c(9)_"if '$data(pVars(""NAMESPACE"")) set pVars(""NAMESPACE"")=..#NAMESPACE")
    do %code.WriteLine($c(9)_"if '$data(pVars(""DBNAME"")) set pVars(""DBNAME"")=..#DBNAME")
    do %code.WriteLine($c(9)_"if '$data(pVars(""DBPATH"")) set pVars(""DBPATH"")=..#DBPATH")
    do %code.WriteLine($c(9)_"if '$data(pVars(""CSPAPP"")) set pVars(""CSPAPP"")=..#CSPAPP")
    do %code.WriteLine($c(9)_"if '$data(pVars(""CSPAPPDIR"")) set pVars(""CSPAPPDIR"")=..#CSPAPPDIR")
    do %code.WriteLine($c(9)_"if '$data(pVars(""CSPAPPDESC"")) set pVars(""CSPAPPDESC"")=..#CSPAPPDESC")
    do %code.WriteLine($c(9)_"if '$data(pVars(""CSPAPPROUTER"")) set pVars(""CSPAPPROUTER"")=..#ROUTER")
    quit ##class(%Installer.Manifest).%Generate(%compiledclass, %code, "setup")
}

XData setup [ XMLNamespace = INSTALLER ]
{
<Manifest>
<Invoke Class="${CURRENTCLASS}" Method="PrepareData" CheckStatus="false" Return="APPDATA">
</Invoke>
<Namespace Name="${NAMESPACE}" Ensemble="false" Create="yes">
<Configuration>
<Database Name="${DBNAME}" Dir="${DBPATH}" Create="yes"/>
<CSPApplication Url="${CSPAPP}" Directory="${CSPAPPDIR}" Description="${CSPAPPDESC}"/>
<Import File="${APPDATA}" Flags="cdfk-u" IgnoreErrors="true" Recurse="true"/>
</Configuration>
</Namespace>
<Namespace Name="${CURRENTNS}">
<Invoke Class="${CURRENTCLASS}" Method="SetDispatchClass" CheckStatus="true">
<Arg Value="${CSPAPP}"/>
<Arg Value="${CSPAPPROUTER}"/>
</Invoke>
</Namespace>
</Manifest>
}

ClassMethod PrepareData() As %String
{
    set tmpFile=##class(%File).TempFilename("xml")
    set tmpFileFS=##class(%Stream.FileBinary).%New()
    set tmpFileFS.Filename=tmpFile
    set xdata=##class(%Dictionary.XDataDefinition).%OpenId(..%ClassName(1)_"||Data",0)
    set status=##class(%XML.TextReader).ParseStream(xdata.Data, .textreader)
    set data=""
    while textreader.Read() { 
        if (textreader.NodeType="chars") { 
            set data=data_textreader.Value
            set data=$translate(data,$char(13,10))
            set data4Decode=$extract(data,1,$length(data)\4*4)
            do tmpFileFS.Write($system.Encryption.Base64Decode(data4Decode))
            set data=$extract(data,$length(data4Decode)+1,*)
        } 
    }
    do tmpFileFS.Write($system.Encryption.Base64Decode(data))
    do tmpFileFS.%Save()
    quit tmpFile
}

ClassMethod SetDispatchClass(pCSPName As %String = "", pDispatchClass As %String = "") As %Status
{
    new $namespace
    znspace "%SYS"
    set props("DispatchClass")=pDispatchClass
    set props("Recurse")=1
    d ##class(Security.Applications).Modify(pCSPName,.props)
    quit $$$OK
}

}
