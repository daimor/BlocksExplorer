Class Blocks.WebSocket Extends %CSP.WebSocket
{

Parameter UseSession = 0;

Property ResourceName As %String;

Property ChildPID As %Integer;

Property Event As %String;

Method ResourceNameGet() As %String
{
	set resName = "blocks" _ $job
	if '$system.Event.Defined(resName) {
		do $system.Event.Create(resName)
	}
	quit resName
}

Method OnPreServer() As %Status
{
    Quit $$$OK
}

Method Server() As %Status
{
    Set timeout=.1
    set quit=0
    #dim exception As %Exception.AbstractException
    Set len=32656
    while 'quit {
        try {
            Set data=..Read(.len, .status, timeout)
            If $$$ISERR(status),$$$GETERRORCODE(status) = $$$CSPWebSocketClosed {
                set quit=1
                quit
            }
            set timeouted = 0
            If $$$ISERR(status),$$$GETERRORCODE(status) = $$$CSPWebSocketTimeout {
                set timeouted = 1
            }
            if timeouted {
                set sc = ..SendBlocksData()
            } else {
                set sc = ..Action(data)
            }
            $$$ThrowOnError(sc)
        } catch exception {
            do ..Write("error", exception.DisplayString())
            set quit=1
        }
    }
    Set status=..EndServer()
    Quit $$$OK
}

Method SendBlocksData() As %Status
{
    set st = $$$OK

    quit:..Event="" $$$OK

    set child = ..ChildPID
    set resName = ..ResourceName

    set responseData = ##class(%DynamicArray).%New()
    kill blocksData
    set countData=0
    set atEnd=0
    while 'atEnd {
    	set $lb(sc,data)=$system.Event.WaitMsg(resName, 0)
    	if sc<=0,'$data(^$JOB(child)) {
    		set atEnd=1
    		quit
    	}
    	continue:data=""
        set $listbuild(parent,block,global,fill)=data
        if $p(..Event,"_",2)="tree" {
            if '$data(blocksData(parent)) {
                set blocksData(parent)=##class(%DynamicObject).%New()
                set blocksData(parent).block = parent
                set blocksData(parent).child = ##class(%DynamicArray).%New()
                do responseData.%Push(blocksData(parent))
            }
            do blocksData(parent).child.%Push(block)
        } else {
            if '$data(blocksData(global)) {
                set blocksData(global)=##class(%DynamicObject).%New()
                set blocksData(global).global = global
                set blocksData(global).blocks = ##class(%DynamicArray).%New()
                do responseData.%Push(blocksData(global))
            }
            set blockInfo = ##class(%DynamicArray).%New()
            do blockInfo.%Push(block)
            do blockInfo.%Push(fill)
            do blocksData(global).blocks.%Push(blockInfo)
            kill blockInfo
        }
        quit:$i(countData)>=1000
	}
    if responseData.Size > 0 {
      do ..Write(..Event, responseData)
    }
    if atEnd {
        set ..Event = ""
    }

    quit $$$OK
}

Method Action(obj As %DynamicObject) As %Status
{
    set st = $$$OK
    #dim exception As %Exception.AbstractException
    try {
      quit:obj=""
        set action = obj.event
        set data = ##class(%DynamicArray).%New()
        if action="ping" {
            set sc=..Write(action, "pong")
        } elseif $p(action,"_")="blocks" {
            set asTree=($piece(action,"_",2)="tree")

            do $system.Event.Clear(..ResourceName)

			job ##class(Blocks.WebSocket).GetBlocks(obj.data.directory, asTree, ..ResourceName)
			set child=$zchild
			set ..ChildPID = child

            set ..Event = action
        }

    } catch exception {
        set st = exception.AsStatus()
    }
    quit st
}

Method OnPostServer() As %Status
{
    Quit $$$OK
}

ClassMethod GetBlocks(aDirectory As %String = "", aAsTree As %Boolean = 0, ResourceName As %String = "")
{
    set resName="blocks"_$zparent
    quit:aDirectory="" 0

    new $namespace
    znspace "%sys"

    OPEN 63:"^^"_aDirectory

    try {
    	set tSC=..ReadBlocks(aAsTree, 3, "", "", 0, ResourceName)
    } catch ex {
    	set tSC=ex.AsSystemError()
    }

    CLOSE 63
    $$$ThrowOnError(tSC)
    quit $$$OK
}

ClassMethod ReadBlocks(aAsTree As %Boolean = 0, aBlockId As %Integer = 3, aParentBlock = "", aGlobal As %String = "", aHasLong = 0, ResourceName As %String = "")
{
#define toInt(%bytes) ($a(%bytes,1)+($a(%bytes,2)*256)+($a(%bytes,3)*65536)+($a(%bytes,4)*16777216))

    new $namespace
    znspace "%SYS"
    quit:aBlockId=0 0

    set blockSize=8192

    #dim error As %Exception.AbstractException = ""
    try {
        View aBlockId
        if aParentBlock'="" {
            set offset=$view(0,0,-4)
            set offset=$$$toInt(offset)+28
            do add(aParentBlock,aBlockId,aGlobal,offset)
        }
        set blockType=$view($Zutil(40,32,1),0,1)
        set nodes=0
        if blockType=8 {
            if aHasLong {
                For N=1:1 {
                    Set X=$VIEW(N*2,-6)
                    Quit:X=""
                    set gdview=$ascii(X)
                    if $listfind($listbuild(5,7,3),gdview) {
                        set cnt=$piece(X,",",2)
                        set blocks=$piece(X,",",4,*)
                        for i=1:1:cnt {
                            set nextBlock=$piece(X,",",3+i)
                            do add(aBlockId,nextBlock,aGlobal,blockSize)
                        }
                    }
                }
            }
        } else {
            For N=1:1 {
                Set X=$VIEW(N-1*2+1,-6)
                Quit:X=""
                Set nextBlock=$VIEW(N*2,-5)
                if blockType=9 set aGlobal=X
                set haslong=0
                if $piece($view(N*2,-6),",",1) {
                    set haslong=1
                }
                set nodes($increment(nodes))=$listbuild(nextBlock,aGlobal,haslong)
            }
        }

        for i=1:1:nodes {
            do ..ReadBlocks(aAsTree, $listget(nodes(i)), aBlockId, $listget(nodes(i),2), $listget(nodes(i),3), ResourceName)
        }
    } catch error {

    }
    #; finally

    if $isobject(error) Throw error

    quit $$$OK
add(parentBlock,blockId,global,offset)
    set data=$listbuild(parentBlock,blockId)
    if 'aAsTree set data=data_$listbuild(global,$j(offset/blockSize*100,0,0))
 	  do $system.Event.Signal(ResourceName, data)
}

/// Reads up to len characters from the client.
/// If the call is successful the status (sc) will be returned as $$$OK, otherwise an error code of $$$CSPWebSocketTimeout
/// indicates a timeout and $$$CSPWebSocketClosed indicates that the client has terminated the WebSocket.
Method Read(ByRef len As %Integer = 32656, ByRef sc As %Status, timeout As %Integer = 86400) As %String
{
    Set json = ##super(len, .sc, timeout)
    Do:$$$ISERR(sc) ..EndServer()
    quit:json="" ""
    try {
      set obj = ##class(%DynamicObject).%FromJSON(json)
    } catch ex {
      set sc = ex.AsStatus()
      set obj = ""
    }
    Quit obj
}

Method Write(eventName As %String = "", data As %String) As %Status
{
    if '$d(data) {
        quit ##super(eventName)
    }
    set response = ##class(%DynamicObject).%New()
    set response.event = eventName
    set response.data = data

    set json = response.%ToJSON()
    quit ##super(json)
}

}
