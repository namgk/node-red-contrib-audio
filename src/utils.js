function isLocalFile(source){
  return !source.startsWith('http://') && 
          !source.startsWith('https://')
}

module.exports = {
  isLocalFile: isLocalFile
}