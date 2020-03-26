#!/bin/bash

if [ "$#" -lt 1 ]; then
  # just start server
  if [ -f /iris-main ]; then
    /iris-main
  else
    /ccontainermain
  fi
  exit
fi

COMMAND=$1
if [ -x "$(command -v ccontrol)" ]; then
  CCONTROL=ccontrol
else
  CCONTROL=iris
fi

if [ "${COMMAND,,}" = "generate" ]; then
  shift
  re='^[0-9]+$'
  if ! [[ "$1" =~ $re ]]; then
    DATABASE=$1
    shift
  fi
  OutputFolder=/out/
  CellSize=${1:-1}
  CellSpace=${2:-0}
  ShowFill=${3:-0}
  DATABASE=${DATABASE:-/db}

  echo
  echo "Starting server..."
  $CCONTROL start $ISC_PACKAGE_INSTANCENAME quietly
  echo
  echo "Generating image..."
  echo "Database = \"$DATABASE\""
  echo "OutputFolder = \"$OutputFolder\""
  echo "CellSize = $CellSize"
  echo "CellSpace = $CellSpace"
  echo "ShowFill = $ShowFill"
  rm ${OutputFolder}BlocksMap.{png,bmp}
  $CCONTROL session $ISC_PACKAGE_INSTANCENAME -UBLOCKS "##class(Blocks.BlocksMap).Generate(\"$DATABASE\",\"${OutputFolder}\",\"${CellSize}\",\"${CellSpace}\",\"${ShowFill}\")"
  echo
  echo "Stopping server..."
  $CCONTROL stop $ISC_PACKAGE_INSTANCENAME quietly
  echo "Finished"
else
  /bin/echo -e "" \
  "Available commands:\n\n" \
  "  help      - this help\n" \
  "  generate  - will generate BlocksMap for the database located in /opt/blocks/db/test/\n" \
  "              as an image in bmp and png format in folder /opt/blocks/out\n"
  "              \n"
fi
