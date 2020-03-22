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
  if [ "$#" -lt 2 ]; then
    DATABASE="/opt/blocks/db/test/"
  else
    DATABASE=$2
  fi
  echo Database $DATABASE
  echo "Starting server..."
  $CCONTROL start $ISC_PACKAGE_INSTANCENAME quietly
  echo "Generating image..."
  $CCONTROL session $ISC_PACKAGE_INSTANCENAME -UBLOCKS "##class(Blocks.BlocksMap).Generate(\"$DATABASE\")"
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
