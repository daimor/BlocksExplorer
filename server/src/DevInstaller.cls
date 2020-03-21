Class Blocks.DevInstaller
{

XData setup [ XMLNamespace = INSTALLER ]
{
<Manifest>
  <Default Name="FOLDER" Dir="/opt/blocks/" />
  <Default Name="APPDATA" Dir="${FOLDER}src" />
  <Default Name="NAMESPACE" Value="BLOCKS" />
  <Default Name="DBNAME" Value="BLOCKS" />
  <Default Name="DBPATH" Dir="${FOLDER}db/data" />
  <Default Name="CSPAPP" Value="/blocks" />
  <Default Name="CSPAPPWS" Value="/csp/blocks" />
  <Default Name="CSPAPPDIR" Dir="${FOLDER}web" />

  <!-- TEST Temp DB -->
  <Default Name="TESTDB" Value="TEST" />
  <Default Name="TESTDBPATH" Dir="${FOLDER}db/test" />

  <Namespace Name="${NAMESPACE}" Ensemble="false" Create="yes" Code="${DBNAME}" Data="${DBNAME}">
    <Configuration>
      <Database Name="${DBNAME}" Dir="${DBPATH}" Create="yes"/>
      <Database Name="${TESTDB}" Dir="${TESTDBPATH}" Create="yes"/>
    </Configuration>

    <Import File="${APPDATA}" IgnoreErrors="true" Recurse="true"/>
    <CSPApplication
      Url="${CSPAPP}"
      Directory="${CSPAPPDIR}"
      CookiePath="/"
      IsNamespaceDefault="1" />
  </Namespace>
  <Namespace Name="${CURRENTNS}">
    <Invoke Class="${CURRENTCLASS}" Method="SetDispatchClass" CheckStatus="true">
      <Arg Value="${CSPAPP}"/>
      <Arg Value="Blocks.Router"/>
    </Invoke>
  </Namespace>

</Manifest>
}

ClassMethod setupWithVars(pRootDir As %String = "")
{
  set vars("FOLDER") = ##class(%File).NormalizeDirectory(pRootDir)
  quit ..setup(.vars)
}

ClassMethod setup(ByRef pVars, pLogLevel As %Integer = 3, pInstaller As %Installer.Installer, pLogger As %Installer.AbstractLogger) As %Status [ CodeMode = objectgenerator ]
{
  do %code.WriteLine($c(9)_"set pVars(""CURRENTCLASS"")="""_%classname_"""")
  do %code.WriteLine($c(9)_"set pVars(""CURRENTNS"")=$namespace")
  quit ##class(%Installer.Manifest).%Generate(%compiledclass, %code, "setup")
}

ClassMethod SetDispatchClass(pCSPName As %String = "", pDispatchClass As %String = "") As %Status
{
  new $namespace
  znspace "%SYS"
  set props("DispatchClass")=pDispatchClass
  set props("Recurse")=1
  set props("AutheEnabled") = 64
  set props("MatchRoles") = ":%ALL"
  d ##class(Security.Applications).Modify(pCSPName,.props)
  quit $$$OK
}

}
