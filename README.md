![zpm](https://github.com/daimor/BlocksExplorer/workflows/zpm/badge.svg)

# Blocks Explorer
[![Quality Gate Status](https://community.objectscriptquality.com/api/project_badges/measure?project=intersystems_iris_community%2FCacheBlocksExplorer&metric=alert_status)](https://community.objectscriptquality.com/dashboard?id=intersystems_iris_community%2FCacheBlocksExplorer) 
 
Database Blocks Explorer for InterSystems IRIS/Caché

#### Key features
##### Tree explorer
+ Shows tree of database blocks;
+ Export tree as SVG or PNG image;
+ Shows every node in the block;
+ Open any block just by clicking on node in parent block;
+ Reload block info by clicking at the same node second time;
+ Zoom in and out, fit and navigator;
+ Easy way to switch between view modes (tree/map);

##### Fragmentation map
+ Shows every block with the same colour for every globals;
+ Legend for globals;

#### Run with Docker
You need license key for Caché or IRIS on RedHat systems.
##### Caché
```
docker run -d --name blocksexplorer --rm \
       -p 57772:57772 \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v ~/cache.key:/usr/cachesys/mgr/cache.key \
       daimor/blocksexplorer:cache
```
Generate blocks map as image file in `out` directory
```
docker run -it --rm \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v `pwd`/out:/opt/blocks/out \
       daimor/blocksexplorer:cache generate
```

##### IRIS
```
docker run -d --name blocksexplorer --rm \
       -p 52773:52773 \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       daimor/blocksexplorer:iris
```

Generate blocks map as image file in `out` directory
```
docker run -it --rm \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v `pwd`/out:/opt/blocks/out \
       daimor/blocksexplorer:iris generate
```


#### Development mode
Run with docker-compose, will start web part with hot reloading.
```
docker-compose up -d --build
```
It will start server base on IRIS
To start on Caché use this command
```
MODE=cache docker-compose up -d --build
```
By default running on 80 port. To start using it, just open http://localhost/

## Screenshots

![Tree](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/TreeView.png)
![Map](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/MapView.png)

## CLI mode

Using prebuild docker image gives a way to generate a picture for any IRIS or Caché database.
Use docker image `daimor/blocksexplorer:iris` for IRIS or `daimor/blocksexplorer:cache` for Caché Databases.
Those images accepts command `generate` with arguments

* path to the tested databases inside a container, by default `/db`, can be omited
* cellSize - size of the cell in pixels, where each cell represents particular database's block, by default 1
* cellSpace - sorrounding space between cell, by default 0
* showFill - sign to show how much block fill by data, by default 0

This tool generates a square picture in folder /out inside a container in formats BMP and PNG. 

So, with command like this 
```
docker run -v `pwd`/out:/out daimor/blocksexplorer:iris generate 20 1 1
```
It will generate this picture for an empty database.  

![TESTDB](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/TESTDB_20_1_1.png)
With a lighter color visible that most of the blocks just empty.  

The same test empty database, but with showFill=0
```
docker run -v `pwd`/out:/out daimor/blocksexplorer:iris generate 20 1 0
```
Blocks have different colors but just for globals, and does not show how much it fill. 

![TESTDB](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/TESTDB_20_1_0.png)

More examples  
ENSLIB
```
docker run -v `pwd`/out:/out daimor/blocksexplorer:iris generate /usr/irissys/mgr/enslib 5 1
```
![ENSLIB](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/ENSLIB_5_1_0.png)

IRISSYS
```
docker run -v `pwd`/out:/out daimor/blocksexplorer:iris generate /usr/irissys/mgr/ 5 1 1
```
![IRISSYS](https://raw.githubusercontent.com/daimor/BlocksExplorer/master/images/IRISSYS_5_1_1.png)


For large databases, would not recommend to use have too big cellSize.

### Useful Links

There you can find more about database internals, and how to use this tool.
* [Internal Structure of Caché Database Blocks, Part 1](https://community.intersystems.com/post/internal-structure-cach%C3%A9-database-blocks-part-1)
* [Internal Structure of Caché Database Blocks, Part 2](https://community.intersystems.com/post/internal-structure-cach%C3%A9-database-blocks-part-2)
* [Internal Structure of Caché Database Blocks, Part 3](https://community.intersystems.com/post/internal-structure-cach%C3%A9-database-blocks-part-3)

