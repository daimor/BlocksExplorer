ARG CACHE_VERSION=2018.1
FROM node:8-alpine AS web

WORKDIR /opt/blocks/

COPY web ./

RUN npm install \
 && export PATH="$PATH:./node_modules/.bin" \
 && webpack --mode production

FROM daimor/intersystems-cache:${CACHE_VERSION}

WORKDIR /opt/blocks

RUN yum -y install ImageMagick

COPY ./server/src/ ./src
COPY --from=web /opt/blocks/build/ /usr/cachesys/csp/blocks/

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

COPY entrypoint.sh /

ENTRYPOINT [ "/entrypoint.sh" ]
