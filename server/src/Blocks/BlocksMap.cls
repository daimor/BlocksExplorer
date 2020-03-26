Class Blocks.BlocksMap
{

Parameter DefaultOutputFolder = "/opt/blocks/out/";

ClassMethod Generate(aDirectory = "", pOutputFolder = {..#DefaultOutputFolder}, cellSize = 1, cellSpace = 0, showFill = 0) As %Status
{
  If '##class(%File).DirectoryExists(pOutputFolder) {
    Quit $$$ERROR($$$GeneralError, "OutputFolder must exist")
  }

  Set tSC = ..GenerateMap(aDirectory)
  If $$$ISERR(tSC) {
    Do $System.OBJ.DisplayError(tSC)
    Quit tSC
  }

  Set tSC = ..DrawMap(.pOutputFolder, cellSize, cellSpace, showFill)
  If $$$ISERR(tSC) {
    Do $System.OBJ.DisplayError(tSC)
    Quit tSC
  }

  Set tSC = ..ConvertMap(.pOutputFolder)
  If $$$ISERR(tSC) {
    Do $System.OBJ.DisplayError(tSC)
    Quit tSC
  }
  Quit $$$OK
}

ClassMethod ConvertMap(pOutputFolder = {..#DefaultOutputFolder}) As %Status
{
  Set fileNameBMP = ##class(%File).NormalizeFilename("BlocksMap.bmp", pOutputFolder)
  Set fileNamePNG = ##class(%File).NormalizeFilename("BlocksMap.png", pOutputFolder)
  Do ##class(%File).Delete(fileNamePNG)

  Set ok = $ZF(-100, "/SHELL", "convert", fileNameBMP, fileNamePNG)
  Quit $$$OK
}

ClassMethod DrawMap(pOutputFolder = {..#DefaultOutputFolder}, cellSize = 1, cellSpace = 0, showFill = 0) As %Status
{
  Set mapGN = $Name(^||BlocksMap)
  Do ..initColors()
  Set cellSpace = $System.SQL.CEILING(cellSpace / 2) * 2

  Set fileName = ##class(%File).NormalizeFilename("BlocksMap.bmp", pOutputFolder)
  Do ##class(%File).Delete(fileName)

  Set file = ##class(%Stream.FileBinary).%New()
  Set file.Filename = fileName
  Do file.Clear()

  Set $Listbuild(blocks, size) = $Get(@mapGN)

  Set width = size * ( cellSize + cellSpace )
  Set height = width

  Set bytesPerPixel = 3
  Set bfOffBits = 54

  Set bfSize = bfOffBits + (bytesPerPixel*width*height)
  Set fileHeader = ""
    _ "BM"                    // WORD    bfType
    _ ..justify(bfSize, 4)    // DWORD   bfSize
    _ ..justify(0, 2)         // WORD    bfReserved1
    _ ..justify(0, 2)         // WORD    bfReserved2
    _ ..justify(bfOffBits, 4) // DWORD   bfOffBits

  Set biSize = 40
  Set biWidth = width
  Set biHeight = height
  Set biPlanes = 1
  Set biBitCount = bytesPerPixel * 8
  Set biCompression = 0
  Set biSizeImage = 0
  Set biXPelsPerMeter = 0
  Set biYPelsPerMeter = 0
  Set biClrUsed = 0
  Set biClrImportant = 0

  Set infoHeader = ""
    _ ..justify(biSize, 4)            // DWORD  biSize;
    _ ..justify(biWidth, 4)           // LONG   biWidth;
    _ ..justify(biHeight, 4)          // LONG   biHeight;
    _ ..justify(biPlanes, 2)          // WORD   biPlanes;
    _ ..justify(biBitCount, 2)        // WORD   biBitCount;
    _ ..justify(biCompression, 4)     // DWORD  biCompression;
    _ ..justify(biSizeImage, 4)       // DWORD  biSizeImage;
    _ ..justify(biXPelsPerMeter, 4)   // LONG   biXPelsPerMeter;
    _ ..justify(biYPelsPerMeter, 4)   // LONG   biYPelsPerMeter;
    _ ..justify(biClrUsed, 4)         // DWORD  biClrUsed;
    _ ..justify(biClrImportant, 4)    // DWORD  biClrImportant;


  Do file.Write(fileHeader)
  Do file.Write(infoHeader)

  Set paddingSize = (4 - (width * bytesPerPixel) # 4) # 4
  For y=biHeight:-1:1 {
    Set line = ""
    For x=1:1:biWidth {
      Set $Listbuild(red, green, blue) = ..getColor(y, x, size, cellSize, cellSpace, showFill)
      Set color = ""
        _ ..justify(red, 1)
        _ ..justify(green, 1)
        _ ..justify(blue, 1)
      Set line = line _ color
    }
    Do file.Write(line _ ..justify(0, paddingSize))
  }

  Set tSC = file.%Save()
  Do file.%Close()
  Quit tSC
}

ClassMethod initColors() As %Status
{
  Set mapGN = $Name(^||BlocksMap)
  Set maxCount = $Get(@mapGN@("Globals"))
  Kill @mapGN@("Colors")

  For i=1:1:maxCount {
    Set ksi = i / maxCount

    If (ksi < 0.5) {
      Set red = ksi * 2
      Set blue = (0.5 - ksi) * 2
    }
    Else {
      Set red = (1.0 - ksi) * 2
      Set blue = (ksi - 0.5) * 2
    }

    If (ksi >= 0.3) && (ksi < 0.8) {
      Set green = (ksi - 0.3) * 2
    }
    ElseIf (ksi < 0.3) {
      Set green = (0.3 - ksi) * 2
    }
    Else {
      Set green = (1.3 - ksi) * 2
    }

    Set red = $System.SQL.FLOOR(red * 255)
    Set green = $System.SQL.FLOOR(green * 255)
    Set blue = $System.SQL.FLOOR(blue * 255)

    Set color = $Listbuild(red, green, blue)
    Set @mapGN@("Colors", i) = color
  }
}

ClassMethod getColor(y, x, size, cellSize, cellSpace, showFill) As %List
{
  Set mapGN = $Name(^||BlocksMap)

  Set padding = 0
  Set spacing = 0
  If cellSpace {
    Set padding = cellSpace \ 2

    Set spacing = (y <= padding) || (x <= padding)
    Set spacing = spacing || (x # (cellSize + cellSpace) <= padding)
    Set spacing = spacing || (y # (cellSize + cellSpace) <= padding)
  }
  Set blockX = x - 1 \ (cellSize + cellSpace) + 1
  Set blockY = y - 1 \ (cellSize + cellSpace) + 1

  If spacing {
    Set red = 222
    Set green = 222
    Set blue = 222
  }
  ElseIf $Data(@mapGN@("Map", blockY, blockX), blockInfo) {
    Set $Listbuild(globalNum, fill) = blockInfo
    Set $Listbuild(red, green, blue) = $Get(@mapGN@("Colors", globalNum))
    if (showFill) {
      Set fillSize = $System.SQL.CEILING(fill / 100 * cellSize) + 1
      Set:fillSize<1 fillSize = 1
      if ( y # (cellSize + cellSpace) > fillSize) {
        Set alpha = 0.5
        Set red = (1-alpha) * 255 + (alpha * red)
        Set green = (1-alpha) * 255 + (alpha * green)
        Set blue = (1-alpha) * 255 + (alpha * blue)
      }
    }
  }
  Else {
    Set red = 255
    Set green = 255
    Set blue = 255
  }

  Quit $Listbuild(red, green, blue)
}

ClassMethod GenerateMap(aDirectory = "") As %Status
{
#Define SYS do ##Continue
  . New $Namespace Set $Namespace = "%SYS"

  If aDirectory="" {
    Quit $$$ERROR($$$GeneralError, "Directory must be specified")
  }
  $$$SYS Set db = ##class(SYS.Database).%OpenId(aDirectory)
  If '$IsObject(db) {
    Quit $$$ERROR($$$GeneralError, "Specified database does not exists or does not available")
  }

  Set mapGN = $Name(^||BlocksMap)
  Kill @mapGN

  Set blocks = db.Blocks
  Set size = $System.SQL.CEILING($ZSqr(blocks))
  Set @mapGN = $Listbuild(blocks, size)

  Set resName = "blocks"_$Job
  If '$System.Event.Defined(resName) {
    Do $System.Event.Create(resName)
  }

  Job ##class(Blocks.WebSocket).GetBlocks(aDirectory, 0, resName)

  Set $Listbuild(sc, data)=$System.Event.WaitMsg(resName, 0)
  Set child = $ZChild

  Set atEnd = 0
  While 'atEnd {
    Set $Listbuild(sc,data)=$System.Event.WaitMsg(resName, 0)
    If sc<=0,'$Data(^$JOB(child)) {
    		Set atEnd = 1
    		Quit
    }
    Continue:data=""
    Set $Listbuild(parent, block, global, fill) = data
    Continue:global=""
    If '$Data(@mapGN@("Globals", global), globalNum) {
      Set globalNum = $Increment(@mapGN@("Globals"))
      Set @mapGN@("Globals", global) = globalNum
    }

    Set x = block - 1 # size + 1
    Set y = block - 1 \ size + 1
    Set @mapGN@("Map", y, x) = $Listbuild(globalNum, fill)
  }

  Quit $$$OK
}

ClassMethod justify(val, len = 4, back = 1) As %String
{
  Set result = ""
  For i=1:1:len {
    Set:'back result = $Char(val#256) _ result
    Set:back result = result _ $Char(val#256)
    Set val = val\256
  }
  Quit result
}

}
