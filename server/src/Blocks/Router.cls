Include %syDatabase

Class Blocks.Router Extends %CSP.REST
{

XData UrlMap
{
<Routes>
    <Route Url="(?:/rest)?/websocket" Method="GET" Call="WebSocket"/>
    <Route Url="(?:/rest)?/dblist" Method="GET" Call="DBList"/>
    <Route Url="(?:/rest)?/ping" Method="GET" Call="Ping"/>
    <Route Url="(?:/rest)?/block/:block" Method="GET" Call="BlockInfo"/>
    <Route Url="(?:/rest)?/block/:block" Method="POST" Call="BlockInfo"/>
    <Route Url="/((?!rest/).*)" Method="GET" Call="GetStatic"/>
</Routes>
}

ClassMethod WebSocket() As %Status
{
  Do ##class(%Library.Device).ReDirectIO(0)
  Quit ##class(Blocks.WebSocket).Page(0)
}

ClassMethod outputJSON(data)
{
#dim %response As %CSP.Response
	set %response.ContentType = "application/json"

	if $data(data),$isobject(data) {
    if data.%IsA("%ZEN.proxyObject") {
  		quit data.%ToJSON()
    } else {
      write data.%ToJSON()
      quit $$$OK
    }
	}

	quit $$$OK
}

ClassMethod GetStatic(pName As %String = "") As %Status
{
    #dim %response As %CSP.Response

    set tName = pName
    if tName = "" set tName = "index.html"
    set tName = $tr(tName,".","_")
    set ext = $zcvt($p(tName,"_",*),"l")
    if ##class(%CSP.StreamServer).FileClassify(ext,.type) {
        set %response.ContentType = type
    }
    set xdata = ##class(%Dictionary.XDataDefinition).%OpenId(..%ClassName(1)_"||"_tName)
    if $isobject(xdata) {
        set status=##class(%XML.TextReader).ParseStream(xdata.Data, .textreader)
        set isBase64=xdata.Description["*base64*"
        if $isobject(textreader) {
            set data=""
            while textreader.Read() {
                if (textreader.NodeType="chars") {
                    if isBase64 {
                        set data=data_textreader.Value
                        set data=$translate(data,$char(13,10))
                        set data4Decode=$extract(data,1,$length(data)\4*4)
                        write $system.Encryption.Base64Decode(data4Decode)
                        set data=$extract(data,$length(data4Decode)+1,*)
                    } else {
                        write textreader.Value
                    }
                }
            }
            write $system.Encryption.Base64Decode(data)
            quit $$$OK
        } else {
            quit xdata.Data.OutputToDevice()
        }
    }

    set tName = %request.GetCgiEnv("SCRIPT_FILENAME")
    if pName = "" set tName = ##class(%File).NormalizeFilename("index.html", tName)
    if ##class(%File).Exists(tName) {
        set stream = ##class(%Stream.FileBinary).%New()
        set stream.Filename = tName
        quit stream.OutputToDevice()
    }
    quit $$$OK
}

ClassMethod Ping() As %Status
{
  set result = {}
  set result.ping = "pong"
  set result.session = %session.SessionId
  quit ..outputJSON(result)
}

ClassMethod DBList() As %Status
{
    new $namespace
    znspace "%SYS"

    write "["
    set first = 1

    set tStatement=##class(%SQL.Statement).%New()
    set tSC=tStatement.%PrepareClassQuery("Config.Databases","List")
    #dim rset As %SQL.StatementResult = tStatement.%Execute()
    while rset.%Next() {
        set dir=rset.%Get("Directory")
        set name=rset.%Get("Name")
        set was($zconvert(dir,"L"))=name
        do add(name,dir)
    }

    set tSC=tStatement.%PrepareClassQuery("SYS.Database","List")
    set rset = tStatement.%Execute()
    while rset.%Next() {
        set dir=rset.%Get("Directory")
        continue:$data(was($zconvert(dir,"L")))
        do add(dir,dir)
    }
    write "]"
    quit ..outputJSON()
add(name,dir)
    set db=##class(SYS.Database).%OpenId(dir)
    set blocks=db.Size*1024*1024/db.BlockSize
    Set tJSON = ##class(%ZEN.proxyObject).%New()
    set tJSON.name = name
    set tJSON.directory = dir
    set tJSON.blocks = blocks
    if 'first write ", "
    set first = 0
    do tJSON.%ToJSON()
}

ClassMethod BlockInfo(pBlock) [ ProcedureBlock = 0 ]
{
    new $namespace
    znspace "%SYS"

    set Directory=$select($isobject($get(%request)):%request.Get("directory"),1:"")
    set:Directory="" Directory=$zutil(12,"samples")


    Set tJSON = ##class(%ZEN.proxyObject).%New()
    set tJSON.blockId = pBlock
    Set tJSON.nodes = ##class(%ListOfDataTypes).%New()

    #dim error As %Exception.AbstractException = ""
    try {
        set rc=$$FindPointerBlock^DMREPAIR(Directory,pBlock,.upblock)

        set rc=$$ParseRepairBlock^DMREPAIR(Directory,pBlock,,.OFF,.REPAIR,.REPPRINT,.REPVAL,.REPCCC,.REPLEN,.REPPAD,.REPSUB,.REPBIG,.REPINFO,.N,.TYPE,.LINK,.BIGCOUNT,.PNTLEN,.NEXTPNTLEN,.NEXTPNTVAL,.NEXTPNTOFF,.PNTREF,.NEXTPNTREF,.BLINCVER,.COLLATE,.GARTREE)

        set:$data(OFF) tJSON.offset=OFF
        if $data(TYPE) {
            set tJSON.type=TYPE
            set tJSON.typename=$$GetTypeName^DMREPAIR(TYPE)
        }
        set:$data(LINK) tJSON.link=LINK
        set:$data(BIGCOUNT) tJSON.bigCount=BIGCOUNT

        set:$data(PNTLEN) tJSON.pointerLength=PNTLEN
        set:$data(PNTREF("internal"),val) tJSON.pointerRefInt=$system.Encryption.Base64Encode(val)
        set:$data(PNTREF("printable"),val) tJSON.pointerRef=val

        set:$data(NEXTPNTLEN) tJSON.nextPointerLength=NEXTPNTLEN
        set:$data(NEXTPNTOFF) tJSON.nextPointerOffset=NEXTPNTOFF
        set:$data(NEXTPNTREF("internal"),val) tJSON.nextPointerRefInt=$system.Encryption.Base64Encode(val)
        set:$data(NEXTPNTREF("printable"),val) tJSON.nextPointerRef=val

        set:$data(COLLATE) tJSON.collate=COLLATE

        for i=1:1:N {

            set tNode=##class(%ArrayOfDataTypes).%New()
            do tNode.SetAt(i,"nodeId")

            do:$data(REPAIR(i),repint) tNode.SetAt($system.Encryption.Base64Encode(repint),"internal")
            for var="print","ccc","len","pad","sub","big","info" {
                set val=@("REP"_$zconvert(var,"U"))@(i)
                do tNode.SetAt(val,var)
            }
            if TYPE'=8,$data(REPVAL) {
                set val=$listfromstring(@("REPVAL")@(i))
                if TYPE=9 {
                    do tNode.SetAt($listget(val,1),"blockId")
                    do tNode.SetAt($listget(val,3),"collate")
                } else {
                    do tNode.SetAt($listget(val,2),"blockId")
                }
            }

            do tJSON.nodes.Insert(tNode)
        }
    } catch error {
    }

    if $isobject(error) {
        quit error.AsStatus()
    }

    quit ..outputJSON(tJSON)
}

}
