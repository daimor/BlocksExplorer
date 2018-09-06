ARG CACHE_VERSION=2017.2
FROM daimor/intersystems-cache:${CACHE_VERSION}

WORKDIR /opt/blocks

COPY ./src/ ./src

RUN ccontrol start $ISC_PACKAGE_INSTANCENAME quietly \
 && echo -e "" \
 "do ##class(%SYSTEM.OBJ).Load(\"/opt/blocks/src/DevInstaller.cls\",\"cdk\")\n" \
 "set sc=##class(Blocks.DevInstaller).setupWithVars(\"/opt/blocks/\")\n" \
 "do:'sc \$zu(4,\$j,1)\n" \
 "halt\n" \
 | csession $ISC_PACKAGE_INSTANCENAME -UUSER \
# Stop Caché instance
 && ccontrol stop $ISC_PACKAGE_INSTANCENAME quietly

VOLUME [ "/opt/blocks/db" ]
