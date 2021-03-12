# API Load Test for Azure DevOps Pipelines
A custom task that you can include in your pipeline on Azure DevOps

### Install
```
$ git clone https://github.com/csharp-design-patterns/command.git
$ cd api-load-test
$ npm install --prefix ./buildAndRelease package.json
$ npm install -g json
$ npm install -g tfx-cli
```

### Build for Debug
```
$ npm run build --prefix ./buildAndRelease
$ npm run copyNodeModulesToDist --prefix ./buildAndRelease
```

### Run for Debug
```
$ npm start --prefix ./buildAndRelease
```

### Build for Production
```
$ npm run build --prefix ./buildAndRelease
$ npm run updateEnvironment --prefix ./buildAndRelease
$ npm run copyNodeModulesToDist --prefix ./buildAndRelease
$ json -I -f ./buildAndRelease/task.json -e "this.version.Patch++"
$ npm run copyTaskFileToDist --prefix ./buildAndRelease
```

### Pack and Publish
```
$ tfx extension create --manifest-globs vss-extension.json
```

## We are Online! 🚀
See this extension in [Visual Studio Market Place](https://marketplace.visualstudio.com/items?itemName=AlexAlves.task-45D40E5F-142B-4327-95C7-B16BB3BF19B7)

## About:
This custom task was developed by [Alex Alves](https://www.linkedin.com/in/alexalvess/)!