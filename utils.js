module.exports = {
  getRandomInt: (max) => {
    return Math.floor(Math.random() * Math.floor(max));
  },
  asyncForEach: async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
};
