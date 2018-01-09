Class Blocks.DevInstaller
{

XData setup [ XMLNamespace = INSTALLER ]
{
<Manifest>
  <Default Name="FOLDER" Dir="/opt/cacheblocksexplorer/" />
  <Default Name="NAMESPACE" Value="BLOCKS" />
  <Default Name="DBNAME" Value="BLOCKS" />
  <Default Name="DBPATH" Dir="${FOLDER}data" />
  <Default Name="CSPAPP" Value="/blocks" />
  <Default Name="CSPAPPDIR" Dir="${FOLDER}web" />

  <Namespace Name="${NAMESPACE}" Ensemble="false" Create="yes">
    <Configuration>
      <Database Name="${DBNAME}" Dir="${DBPATH}" Create="overwrite"/>
      <Import File="${APPDATA}" IgnoreErrors="true" Recurse="true"/>
      <CSPApplication
        Url="${CSPAPP}"
        Directory="${CSPAPPDIR}"
        IsNamespaceDefault="1" />
    </Configuration>
  </Namespace>
  <Namespace Name="${CURRENTNS}">
    <Invoke Class="${CURRENTCLASS}" Method="SetDispatchClass" CheckStatus="true">
      <Arg Value="${CSPAPP}"/>
      <Arg Value="Blocks.Router"/>
    </Invoke>
  </Namespace>
</Manifest>
}

ClassMethod setupWithVars(
  pRootDir As %String = ""
)
{
  set vars("APPDATA") = ##class(%File).NormalizeDirectory("src", pRootDir)
  set vars("DBPATH") = ##class(%File).NormalizeDirectory("data", pRootDir)
  set vars("TESTDBPATH") = ##class(%File).NormalizeDirectory("test", pRootDir)
  quit ..setup(.vars)
}

ClassMethod setup(
  ByRef pVars,
  pLogLevel As %Integer = 3,
  pInstaller As %Installer.Installer,
  pLogger As %Installer.AbstractLogger
) As %Status [ codemode = objectgenerator ]
{
  do %code.WriteLine($c(9)_"set pVars(""CURRENTCLASS"")="""_%classname_"""")
  do %code.WriteLine($c(9)_"set pVars(""CURRENTNS"")=$namespace")
  quit ##class(%Installer.Manifest).%Generate(%compiledclass, %code, "setup")
}

ClassMethod SetDispatchClass(
  pCSPName As %String = "",
  pDispatchClass As %String = ""
) As %Status
{
  new $namespace
  znspace "%SYS"
  set props("DispatchClass")=pDispatchClass
  set props("Recurse")=1
  d ##class(Security.Applications).Modify(pCSPName,.props)
  quit $$$OK
}

}