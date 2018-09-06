Class Blocks.BlocksInstaller Extends %Projection.AbstractProjection
{

Projection Reference As BlocksInstaller;

Parameter CSPAPP As %String = "/blocks";

Parameter CSPAPPDESCRIPTION As %String = "A WEB application for Cache Blocks Explorer.";

Parameter ROUTER As %String = "Blocks.Router";

/// This method is invoked when a class is compiled.
ClassMethod CreateProjection(cls As %String, ByRef params) As %Status
{
    set ns=$namespace
    new $namespace
    znspace "%SYS"
    
    if ('##class(Security.Applications).Exists(..#CSPAPP)) {
        do ##class(Security.System).GetInstallationSecuritySetting(.security)
        set cspProperties("AutheEnabled") = $select((security="None"):64,1:32)
        set cspProperties("NameSpace") = ns
        set cspProperties("Description") = ..#CSPAPPDESCRIPTION
        set cspProperties("DispatchClass") = ..#ROUTER
        write !, "Creating WEB application """_..#CSPAPP_"""..."
        $$$ThrowOnError(##class(Security.Applications).Create(..#CSPAPP, .cspProperties))
        write !, "WEB application """_..#CSPAPP_""" created."
        if ##class(%Studio.General).GetWebServerPort(,,,.url) {
            write !, "You can now open it with a link: "_url_$p(..#CSPAPP,"/",2,*)_"/"
        }
    } else {
        write !, "WEB application """_..#CSPAPP_""" already exists, so it is ready to use."
    }
    Quit $$$OK
}

/// This method is invoked when a class is 'uncompiled'.
ClassMethod RemoveProjection(cls As %String, ByRef params, recompile As %Boolean) As %Status
{
    new $namespace
    znspace "%SYS"

    if (##class(Security.Applications).Exists(..#CSPAPP)) {
        w !, "Deleting WEB application """_..#CSPAPP_"""..."
        do ##class(Security.Applications).Delete(..#CSPAPP)
        w !, "WEB application """_..#CSPAPP_""" was successfully removed."
    }
    QUIT $$$OK
}

}
