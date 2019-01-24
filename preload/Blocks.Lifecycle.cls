Class Blocks.Lifecycle Extends ZPM.PackageManager.Developer.Lifecycle.Module
{

Method %Activate() As %Status
{
  Set tSC = $$$OK
	Try {
		Set tSC = ##super(.pParams)
		If $$$ISERR(tSC) {
			Quit
		}

    Set tRootDirectory = $Get(pParams("RootDirectory")) _ "/server/"
    Set tVerbose = $Get(pParams("Verbose"),0)
    do ##class(%SYSTEM.OBJ).Load(tRootDirectory _ "src/DevInstaller.cls", "ck")
		Write:tVerbose !,"Doing Blocks.DevInstaller.setup()"
		do ##class(Blocks.DevInstaller).setupWithVars(tRootDirectory)
		Write:tVerbose !,"Done."
	} Catch e {
		Set tSC = e.AsStatus()
	}
	Quit tSC
}

}