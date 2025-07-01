import { scrapeHPU } from '../scrappers/hpuScrapper'
import { scrapeUMD } from '../scrappers/umdScrapper'
import { scrapeUNCC } from '../scrappers/unccScrapper'
import { Meals, Restaurants } from '../models'
import axios from 'axios'
// import cheerio from 'cheerio'
import { load } from 'cheerio'
import { allBrands } from '../utils/data'
import { notifyError } from '../middlewares/errorHandler'

// const brands = [
//   { name: 'Subway', id: '513fbc1283aa2dc80c000005', campus: ['HPU', 'UMD'] },
//   { name: 'Barberitos', id: '521b95434a56d006cae297f3', campus: ['HPU'] },
//   { name: 'Jamba', id: '513fbc1283aa2dc80c000040', campus: ['HPU'] },
//   { name: 'Chick-Fil-A', id: '513fbc1283aa2dc80c000025', campus: ['HPU', 'UMD', 'UNCC'] },
//   { name: 'Starbucks', id: '513fbc1283aa2dc80c00001f', campus: ['HPU', 'UNCC'] },
//   { name: 'Taco Bell', id: '513fbc1283aa2dc80c000020', campus: ['UMD'] },
//   { name: 'Panera Bread', id: '513fbc1283aa2dc80c00000c', campus: ['UMD'] },
//   { name: 'SaladWorks', id: '521b95444a56d006cae29993', campus: ['UMD'] },
//   { name: 'Panda Express', id: '513fbc1283aa2dc80c00002e', campus: ['UMD'] },
//   { name: 'Qdoba', id: '513fbc1283aa2dc80c00003a', campus: ['UMD'] },
//   { name: "Auntie Anne's", id: '513fbc1283aa2dc80c00013e', campus: ['UNCC'] },
//   { name: 'Bojangles', id: '513fbc1283aa2dc80c0002eb', campus: ['UNCC'] },
// ]
// const myArray = [
//   {
//     itemId: 'e8b51617bb2738c22933c394',
//     name: 'Add American Cheese',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '40',
//       protein: '2g',
//       carbohydrate: '1g',
//       fat: '3.5g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516179c8d282293267e72',
//     name: 'Add Egg',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '80',
//       protein: '6g',
//       carbohydrate: '0g',
//       fat: '6g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516172b0f13dc9da8f9b2',
//     name: 'Add Pimento Cheese',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '170',
//       protein: '5g',
//       carbohydrate: '2g',
//       fat: '16g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617b015c23aac3c4312',
//     name: 'Bacon, Egg & Cheese Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '510',
//       protein: '28g',
//       carbohydrate: '40g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161728e8f3b800708810',
//     name: 'BBQ Sauce',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '100',
//       protein: '0g',
//       carbohydrate: '25g',
//       fat: '0g',
//     },
//     serving: '2',
//   },
//   {
//     itemId: 'e8b51617dedf51a7b041aaaa',
//     name: 'Bo-Berry Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '370',
//       protein: '5g',
//       carbohydrate: '49g',
//       fat: '17g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516172fc1ec88654ba15d',
//     name: 'Bo-Tato Rounds, Medium',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '390',
//       protein: '3g',
//       carbohydrate: '40g',
//       fat: '24g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516176b3461bde823051f',
//     name: 'Bo-Tato Rounds, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '650',
//       protein: '5g',
//       carbohydrate: '67g',
//       fat: '40g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617755ab01d8329ff46',
//     name: 'Bo-Tato Rounds, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '260',
//       protein: '2g',
//       carbohydrate: '27g',
//       fat: '16g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516170a190058790986e5',
//     name: "Bo's Chicken Sandwich",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '670',
//       protein: '31g',
//       carbohydrate: '95g',
//       fat: '36g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516174711f4e9aaf0b9b2',
//     name: 'Bojangles Cajun Pintos, Individual',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '130',
//       protein: '7g',
//       carbohydrate: '24g',
//       fat: '0.5g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617817dc24686a29eca',
//     name: 'Bojangles Cajun Pintos, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '420',
//       protein: '22g',
//       carbohydrate: '81g',
//       fat: '2g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516171cb3d3a4fb9b465b',
//     name: "Bojangles' Dirty Rice, Individual",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '170',
//       protein: '5g',
//       carbohydrate: '23g',
//       fat: '6g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161793ece562f0cea85b',
//     name: "Bojangles' Dirty Rice, Picnic",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '530',
//       protein: '15g',
//       carbohydrate: '74g',
//       fat: '18g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161788718a92d0ad82bf',
//     name: 'Brisk Strawberry Melon Tea, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '190',
//       protein: '0g',
//       carbohydrate: '49g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b5161767d198c5f32e10df',
//     name: 'Brisk Strawberry Melon Tea, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '130',
//       protein: '0g',
//       carbohydrate: '34g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617931fa56a06a34e80',
//     name: 'Brisk Strawberry Melon Tea, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '90',
//       protein: '0g',
//       carbohydrate: '25g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b516174cec09317be76541',
//     name: 'Cajun Filet Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '570',
//       protein: '23g',
//       carbohydrate: '57g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617b0b0cad2f7075bb7',
//     name: 'Cheerwine, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '0g',
//       carbohydrate: '112g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617431dd9bd7ecede4d',
//     name: 'Cheerwine, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '77g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b516177a0eee89f04220f7',
//     name: 'Cheerwine, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '56g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b516179298f5da1f6cdda8',
//     name: 'Chicken Breast',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '540',
//       protein: '41g',
//       carbohydrate: '24g',
//       fat: '29g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617e555733f1c64a7c8',
//     name: 'Chicken Leg',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '190',
//       protein: '10g',
//       carbohydrate: '8g',
//       fat: '13g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516179ca596da995ebe5a',
//     name: 'Chicken Rice Bowl (without biscuit)',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '780',
//       protein: '48g',
//       carbohydrate: '86g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516170373329ceb32faef',
//     name: 'Chicken Supremes',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '500',
//       protein: '32g',
//       carbohydrate: '33g',
//       fat: '25g',
//     },
//     serving: '4',
//   },
//   {
//     itemId: 'e8b51617bbabd84643311235',
//     name: 'Chicken Supremes Salad',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '490',
//       protein: '31g',
//       carbohydrate: '28g',
//       fat: '28g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617ddf6edaf00a4ad98',
//     name: 'Chicken Thigh',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '240',
//       protein: '21g',
//       carbohydrate: '14g',
//       fat: '10g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161769529b6d0caf00e0',
//     name: 'Chicken Wing',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '150',
//       protein: '10g',
//       carbohydrate: '8g',
//       fat: '8g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516173ece3878cd29c51f',
//     name: 'Chocolate Milk 1% Lowfat',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '160',
//       protein: '8g',
//       carbohydrate: '27g',
//       fat: '2.5g',
//     },
//     serving: '8',
//   },
//   {
//     itemId: 'e8b51617d4aa60e3168ee4f4',
//     name: 'Cinnamon Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '490',
//       protein: '6g',
//       carbohydrate: '57g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617f2cb569f7a4c02c5',
//     name: 'Cinnamon Twist',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '380',
//       protein: '3g',
//       carbohydrate: '38g',
//       fat: '24g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516171e26cd54f5effb87',
//     name: 'Coffee, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '5',
//       protein: '1g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '20',
//   },
//   {
//     itemId: 'e8b51617c1126aa3e046028b',
//     name: 'Coffee, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '5',
//       protein: '1g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617f8429a2706e10a38',
//     name: 'Cole Slaw, Individual',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '170',
//       protein: '1g',
//       carbohydrate: '20g',
//       fat: '11g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617399d65240b6fdb94',
//     name: 'Cole Slaw, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '580',
//       protein: '4g',
//       carbohydrate: '65g',
//       fat: '35g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161784c0df3a240e2ce0',
//     name: 'Country Ham & Egg Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '460',
//       protein: '20g',
//       carbohydrate: '38g',
//       fat: '25g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516172604433851eac9fd',
//     name: 'Country Ham Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '380',
//       protein: '14g',
//       carbohydrate: '38g',
//       fat: '20g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516178777cdaaa4056ca6',
//     name: 'Creamy Buffalo Sauce',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '170',
//       protein: '0g',
//       carbohydrate: '2g',
//       fat: '18g',
//     },
//     serving: '2',
//   },
//   {
//     itemId: 'e8b516174de8345d73e57919',
//     name: 'Diet Mountain Dew, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516177e0d76115b368469',
//     name: 'Diet Mountain Dew, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617733b822d5e5998d1',
//     name: 'Diet Mountain Dew, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b5161761aea8f99e1403be',
//     name: 'Diet Pepsi, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617ec4a7efb6e1c6de1',
//     name: 'Diet Pepsi, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b5161759c2c0ed651d59d9',
//     name: 'Diet Pepsi, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617139deec0e07aabb3',
//     name: 'Dr Pepper, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '380',
//       protein: '0g',
//       carbohydrate: '104g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516174176cc3d2b33aa30',
//     name: 'Dr Pepper, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '260',
//       protein: '0g',
//       carbohydrate: '72g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617163e9528b40a1bd6',
//     name: 'Dr Pepper, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '190',
//       protein: '0g',
//       carbohydrate: '52g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617278928cccfed6e8b',
//     name: 'Egg & Cheese Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '430',
//       protein: '13g',
//       carbohydrate: '39g',
//       fat: '25g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516171cf1d2b8c725e77f',
//     name: 'Garden Salad',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '120',
//       protein: '7g',
//       carbohydrate: '3g',
//       fat: '9g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516179907aed68d5e1f12',
//     name: 'Gravy Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '430',
//       protein: '11g',
//       carbohydrate: '49g',
//       fat: '21g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516178c571afa9b63f4aa',
//     name: 'Green Beans, Individual',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '20',
//       protein: '1g',
//       carbohydrate: '5g',
//       fat: '0g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161763ee76e9217c7514',
//     name: 'Green Beans, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '70',
//       protein: '4g',
//       carbohydrate: '15g',
//       fat: '0.5g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516173ee4a1f8cf5a95af',
//     name: 'Grilled Chicken Club Sandwich',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '690',
//       protein: '46g',
//       carbohydrate: '39g',
//       fat: '39g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516178ce80dd66b168f35',
//     name: 'Grilled Chicken Salad',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '270',
//       protein: '31g',
//       carbohydrate: '4g',
//       fat: '14g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516175017070522636290',
//     name: 'Grilled Chicken Sandwich',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '570',
//       protein: '29g',
//       carbohydrate: '36g',
//       fat: '33g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161796758f665606dffd',
//     name: 'Grits, Individual',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '90',
//       protein: '2g',
//       carbohydrate: '21g',
//       fat: '0g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617eac1b24393b3dbde',
//     name: 'Grits, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '6g',
//       carbohydrate: '62g',
//       fat: '1g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161712f157a470fa96a1',
//     name: 'Half Gallon Sweet Tea',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '700',
//       protein: '0g',
//       carbohydrate: '181g',
//       fat: '0g',
//     },
//     serving: '0.5',
//   },
//   {
//     itemId: 'e8b51617fc10eabf9964d25e',
//     name: 'Half Gallon Unsweetened Tea',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '20',
//       protein: '0g',
//       carbohydrate: '6g',
//       fat: '0g',
//     },
//     serving: '0.5',
//   },
//   {
//     itemId: 'e8b51617bc55348213362360',
//     name: 'Homestyle Cheese Garlic Croutons',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '60',
//       protein: '1g',
//       carbohydrate: '9g',
//       fat: '2g',
//     },
//     serving: '0.5',
//   },
//   {
//     itemId: 'e8b516178da54f5e02a19c8c',
//     name: 'Homestyle Chicken Tenders',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '490',
//       protein: '31g',
//       carbohydrate: '39g',
//       fat: '24g',
//     },
//     serving: '4',
//   },
//   {
//     itemId: 'e8b5161770b8a30df2578227',
//     name: 'Homestyle Tenders Salad',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '480',
//       protein: '30g',
//       carbohydrate: '32g',
//       fat: '26g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516179db3b6c628724c70',
//     name: 'Honey Mustard Sauce',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '1g',
//       carbohydrate: '13g',
//       fat: '25g',
//     },
//     serving: '2',
//   },
//   {
//     itemId: 'e8b5161735718f6ce29a205f',
//     name: "Ken's Blue Cheese Dressing",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '230',
//       protein: '1g',
//       carbohydrate: '2g',
//       fat: '24g',
//     },
//     serving: '1.5',
//   },
//   {
//     itemId: 'e8b516175a154d110d89e46c',
//     name: "Ken's Buttermilk Ranch Dressing",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '1g',
//       carbohydrate: '2g',
//       fat: '20g',
//     },
//     serving: '1.5',
//   },
//   {
//     itemId: 'e8b51617ccadf41b579763ed',
//     name: "Ken's Fat Free Italian Dressing",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '15',
//       protein: '0g',
//       carbohydrate: '5g',
//       fat: '0g',
//     },
//     serving: '1.5',
//   },
//   {
//     itemId: 'e8b516174feb17d588d14be6',
//     name: "Ken's Honey Dijon Dressing",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '120',
//       protein: '0g',
//       carbohydrate: '14g',
//       fat: '7g',
//     },
//     serving: '1.5',
//   },
//   {
//     itemId: 'e8b5161715fbf31028b806ac',
//     name: 'Kids 2 Piece Homestyle Tenders',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '570',
//       protein: '22g',
//       carbohydrate: '61g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617c9c8c0af17113db8',
//     name: 'Kids 2 Piece Supremes',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '580',
//       protein: '23g',
//       carbohydrate: '59g',
//       fat: '28g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161789a448b2360d57f8',
//     name: 'Kids Chicken Leg',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '520',
//       protein: '16g',
//       carbohydrate: '50g',
//       fat: '29g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516177155de499485500a',
//     name: "Kids Mac 'N Cheese",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '610',
//       protein: '15g',
//       carbohydrate: '63g',
//       fat: '33g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516177ba2e52d05b91b2c',
//     name: "Macaroni 'N Cheese, Individual",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '8g',
//       carbohydrate: '21g',
//       fat: '18g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617a9b4d8d63f5ceb30',
//     name: "Macaroni 'N Cheese, Picnic",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '870',
//       protein: '24g',
//       carbohydrate: '64g',
//       fat: '54g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161740a85d156c7b9841',
//     name: "Mashed Potatoes 'N Brown Gravy, Individual",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '100',
//       protein: '2g',
//       carbohydrate: '18g',
//       fat: '2.5g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516175c70e28d88c1a482',
//     name: "Mashed Potatoes 'N Brown Gravy, Picnic",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '370',
//       protein: '7g',
//       carbohydrate: '69g',
//       fat: '7g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617c2db6e474d1e99b9',
//     name: "Mashed Potatoes 'N Gravy, Picnic",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '410',
//       protein: '13g',
//       carbohydrate: '69g',
//       fat: '9g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516173906b64c35c5c2d8',
//     name: "Mashed Potatoes 'N Old Fashioned Gravy, Individual",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '110',
//       protein: '2g',
//       carbohydrate: '17g',
//       fat: '4g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161761c8abd9479a1339',
//     name: "Mashed Potatoes 'N Old Fashioned Gravy, Picnic",
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '9g',
//       carbohydrate: '66g',
//       fat: '11g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617278b8ec42449c740',
//     name: 'Milk 1% Lowfat',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '110',
//       protein: '8g',
//       carbohydrate: '13g',
//       fat: '2.5g',
//     },
//     serving: '8',
//   },
//   {
//     itemId: 'e8b51617c7de2cdbb60d25fa',
//     name: 'Mirinda Strawberry, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '440',
//       protein: '0g',
//       carbohydrate: '116g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617d8c27573106de8f0',
//     name: 'Mirinda Strawberry, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '300',
//       protein: '0g',
//       carbohydrate: '80g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b516177a81d7090e74cb9c',
//     name: 'Mirinda Strawberry, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '220',
//       protein: '0g',
//       carbohydrate: '58g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617a485309e2c9bfbe4',
//     name: 'Mountain Dew, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '440',
//       protein: '0g',
//       carbohydrate: '116g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516170799960858a9fd3d',
//     name: 'Mountain Dew, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '300',
//       protein: '0g',
//       carbohydrate: '80g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b5161736a737d8ef1ca5cf',
//     name: 'Mountain Dew, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '220',
//       protein: '0g',
//       carbohydrate: '58g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b516172604ce94674c5b9d',
//     name: 'Mug Root Beer, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '0g',
//       carbohydrate: '104g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617238bff6c1cee8f44',
//     name: 'Mug Root Beer, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '72g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617f17c5a1f3199cf74',
//     name: 'Mug Root Beer, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '52g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617f7bf8f5b2ea37018',
//     name: 'Old Fashioned Gravy Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '410',
//       protein: '7g',
//       carbohydrate: '47g',
//       fat: '22g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516179976ebd293ba44d2',
//     name: 'Pepsi Zero, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516177a65e1c9ce881cef',
//     name: 'Pepsi Zero, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617f158184fdc7c6ed7',
//     name: 'Pepsi Zero, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '0',
//       protein: '0g',
//       carbohydrate: '0g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617f3eccbb3a2b2129a',
//     name: 'Pepsi, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '0g',
//       carbohydrate: '112g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516178818cb9eb5a4a2ce',
//     name: 'Pepsi, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '77g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617926f5edaa647c7ee',
//     name: 'Pepsi, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '56g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b5161701f282ec7dd23ed5',
//     name: 'Plain Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '310',
//       protein: '6g',
//       carbohydrate: '37g',
//       fat: '15g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617f1205a633c4adf24',
//     name: 'Ranch Sauce',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '270',
//       protein: '1g',
//       carbohydrate: '4g',
//       fat: '28g',
//     },
//     serving: '2',
//   },
//   {
//     itemId: 'e8b5161764382125ed33d09b',
//     name: 'Roasted Chicken Bites',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '350',
//       protein: '44g',
//       carbohydrate: '9g',
//       fat: '14g',
//     },
//     serving: '6.7',
//   },
//   {
//     itemId: 'e8b51617698ba22138b3a4b4',
//     name: 'Roasted Chicken BitesTM Salad',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '470',
//       protein: '51g',
//       carbohydrate: '13g',
//       fat: '23g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b516176f43b1edb2dbbda6',
//     name: 'Sausage & Egg Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '550',
//       protein: '21g',
//       carbohydrate: '38g',
//       fat: '34g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617307f9efcd9eae27f',
//     name: 'Sausage Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '470',
//       protein: '15g',
//       carbohydrate: '38g',
//       fat: '28g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161749ceb07da0b71042',
//     name: 'Seasoned Fries, Medium',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '450',
//       protein: '4g',
//       carbohydrate: '49g',
//       fat: '26g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617462740597c9f1179',
//     name: 'Seasoned Fries, Picnic',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '670',
//       protein: '6g',
//       carbohydrate: '73g',
//       fat: '38g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b51617223e3510f01b763b',
//     name: 'Seasoned Fries, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '360',
//       protein: '3g',
//       carbohydrate: '39g',
//       fat: '21g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161778c39cfdc75c22b3',
//     name: 'Sierra Mist, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '0g',
//       carbohydrate: '108g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617f155a5d3dc274f97',
//     name: 'Sierra Mist, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '74g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617456630b5f381a4af',
//     name: 'Sierra Mist, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '54g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b5161751b3fa6db06dacd6',
//     name: 'Simply Orange',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '160',
//       protein: '2g',
//       carbohydrate: '37g',
//       fat: '0g',
//     },
//     serving: '11.5',
//   },
//   {
//     itemId: 'e8b51617b017900ae2b5293b',
//     name: 'Southern Filet Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '550',
//       protein: '23g',
//       carbohydrate: '54g',
//       fat: '27g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161758640d01fc617ceb',
//     name: 'Southern Shock, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '450',
//       protein: '0g',
//       carbohydrate: '125g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617684ca1f5e9db96df',
//     name: 'Southern Shock, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '310',
//       protein: '0g',
//       carbohydrate: '86g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b516177d08716d5fe13125',
//     name: 'Southern Shock, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '230',
//       protein: '0g',
//       carbohydrate: '63g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b516175d431e8d2a301d94',
//     name: 'Steak Biscuit',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '620',
//       protein: '16g',
//       carbohydrate: '48g',
//       fat: '40g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161770123555d69e0987',
//     name: 'Sweet Iced Tea, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '350',
//       protein: '0g',
//       carbohydrate: '90g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617f00d99fb733f008d',
//     name: 'Sweet Iced Tea, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '240',
//       protein: '0g',
//       carbohydrate: '62g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b516178b1a0a82489e2cbd',
//     name: 'Sweet Potato Pie',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '350',
//       protein: '3g',
//       carbohydrate: '41g',
//       fat: '20g',
//     },
//     serving: '1',
//   },
//   {
//     itemId: 'e8b5161776b192cde05cd103',
//     name: 'Tropicana Fruit Punch, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '440',
//       protein: '0g',
//       carbohydrate: '120g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617de620fa3d05e59d7',
//     name: 'Tropicana Fruit Punch, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '300',
//       protein: '0g',
//       carbohydrate: '83g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617e4bb4a1b8283fc4a',
//     name: 'Tropicana Fruit Punch, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '220',
//       protein: '0g',
//       carbohydrate: '60g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617990369c20b43d4c4',
//     name: 'Tropicana Lemonade, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '400',
//       protein: '0g',
//       carbohydrate: '108g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617a8a9c5aa5099bed9',
//     name: 'Tropicana Lemonade, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '75g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617fdbb5d2b53925f55',
//     name: 'Tropicana Lemonade, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '54g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617bb4abf1ea6926f6e',
//     name: 'Tropicana Pink Lemonade, Regullar',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '280',
//       protein: '0g',
//       carbohydrate: '74g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b516176d48eb1100a11990',
//     name: 'Tropicana Pink Lemonade, Smal',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '200',
//       protein: '0g',
//       carbohydrate: '54g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617b6a64a1ea4940ab2',
//     name: 'Tropicana Twister Soda, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '440',
//       protein: '0g',
//       carbohydrate: '124g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b516177f7d2179a43922ce',
//     name: 'Tropicana Twister Soda, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '300',
//       protein: '0g',
//       carbohydrate: '86g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617871222829dbd81b2',
//     name: 'Tropicana Twister Soda, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '220',
//       protein: '0g',
//       carbohydrate: '62g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
//   {
//     itemId: 'e8b51617573cf2dd59887639',
//     name: 'Unsweetened Iced Tea, Large',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '10',
//       protein: '0g',
//       carbohydrate: '3g',
//       fat: '0g',
//     },
//     serving: '32',
//   },
//   {
//     itemId: 'e8b51617bff3d78e1e381834',
//     name: 'Unsweetened Iced Tea, Regular',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '5',
//       protein: '0g',
//       carbohydrate: '2g',
//       fat: '0g',
//     },
//     serving: '22',
//   },
//   {
//     itemId: 'e8b51617e0df9027e083b4b3',
//     name: 'Unsweetened Iced Tea, Small',
//     brandName: 'Bojangles',
//     type: 'Unknown',
//     nutrients: {
//       calories: '5',
//       protein: '0g',
//       carbohydrate: '1g',
//       fat: '0g',
//     },
//     serving: '16',
//   },
// ]

export const CONTROLLER_SCRAPPER = {
  async scrapeAllMenus(req, res) {
    res.status(202).json({
      message: 'Scraping completed and data saved to MongoDB successfully',
    })
    try {
      const allData = []
      await Meals.deleteMany({ restaurantType: { $ne: 'Franchise' } })
      console.log(`${result.deletedCount} meals deleted.`)

      console.log('Scraping HPU...')
      const hpuData = await scrapeHPU()
      if (hpuData) allData.push(...hpuData)

      console.log('Scraping UNCC...')
      const unccData = await scrapeUNCC()
      if (unccData) allData.push(...unccData)

      console.log('Scraping UMD...')
      const umdData = await scrapeUMD()
      if (umdData) allData.push(...umdData)

      notifyError('Scrapper Sucess')
    } catch (error) {
      console.error('Error during scraping:', error)
      notifyError(error)
      res.status(500).json({ message: 'Scraping failed', error: error.message })
    }
  },

  // async scrapeNutritionX1(req, res) {
  //   req.setTimeout(1000000)

  //   // https://www.nutritionix.com/nixapi/brands/513fbc1283aa2dc80c000005/items/1?limit=3900
  //   const brandId = req.params.id

  //   // Target URL (the website you want to fetch data from)
  //   const targetUrl = `https://www.nutritionix.com/nixapi/brands/${brandId}/items/1?limit=3900` // Replace with your target website

  //   // Custom User-Agent to simulate a real browser request
  //   const userAgent =
  //     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'

  //   try {
  //     // Send a GET request with a custom User-Agent header
  //     const response = await axios.get(targetUrl, {
  //       headers: {
  //         'User-Agent': userAgent, // Set custom User-Agent to avoid being blocked
  //         Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  //         'Accept-Encoding': 'gzip, deflate, br',
  //         Connection: 'keep-alive',
  //       },
  //     })
  //     const data = response.data.items

  //     let dataArray = []
  //     for (let index = 0; index < data.length; index++) {
  //       const element = data[index]
  //       const targetUrl = `https://www.nutritionix.com/nixapi/items/${element.item_id}`
  //       const response = await axios.get(targetUrl, {
  //         headers: {
  //           'User-Agent': userAgent, // Set custom User-Agent to avoid being blocked
  //           Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  //           'Accept-Encoding': 'gzip, deflate, br',
  //           Connection: 'keep-alive',
  //         },
  //       })
  //       const sanitizedObject = {
  //         itemId: response.data.item_id,
  //         name: response.data.item_name,
  //         brandName: response.data.brand_name,
  //         type: 'Unknown',
  //         nutrients: {
  //           calories: response.data.nf_calories,
  //           protein: response.data.nf_protein,
  //           carbohydrate: response.data.nf_total_carbohydrate,
  //           fat: response.data.nf_total_fat,
  //         },
  //         serving: response.data.nf_serving_size_qty,
  //       }

  //       console.log('ITEM PUSHED:', response.data.item_id)
  //       // dataArray.push(sanitizedObject)
  //     }
  //     // const dbRes = await Meals.insertMany(dataArray)
  //     // let resObj = {
  //     //   name: dataArray[0].brandName,
  //     //   campus: ['HPU', 'UMD'],
  //     //   category: 'Franchise',
  //     //   menu: {
  //     //     category: 'Unknown',
  //     //     items: dbRes.map((doc) => doc._id),
  //     //   },
  //     // }

  //     // await new Restaurants(resObj).save()

  //     res.json({ message: 'Success!' })
  //   } catch (error) {
  //     console.error('Error fetching data:', error.message)
  //   }
  // },
  // async scrapeNutritionX(req, res) {
  //   try {
  //     const itemsToInsert = []

  //     for (const item of myArray) {
  //       const existingItem = await Meals.findOne({ name: item.name })

  //       if (!existingItem) {
  //         itemsToInsert.push(item)
  //       }
  //     }

  //     // Insert the items that do not already exist in the database
  //     const dbRes = await Meals.insertMany(itemsToInsert)
  //     const brandInfo = allBrands.find((brand) => brand.name === myArray[0].brandName)
  //     const campuses = brandInfo ? brandInfo.campus : ['Unknown']
  //     // Construct the response object
  //     const resObj = {
  //       name: myArray[0].brandName,
  //       campus: campuses,
  //       category: 'Franchise',
  //       menu: {
  //         category: 'Unknown',
  //         items: dbRes.map((doc) => doc._id),
  //       },
  //     }

  //     // Save the restaurant object into the Restaurants collection
  //     const restaurant = new Restaurants(resObj)
  //     await restaurant.save()

  //     // Send success response
  //     res.json({ message: 'Success!' })
  //   } catch (error) {
  //     console.error('Error fetching data:', error.message)

  //     // Handle error and send appropriate response
  //     res.status(500).json({
  //       message: 'Error occurred while processing the request',
  //       error: error.message,
  //     })
  //   }
  // },
  // async dataMigration(req, res) {
  //   try {
  //     let skipCount = 500 // Start from the next 500
  //     let limitCount = 500 // Limit to 500 items
  //     let data
  //     let totalProcessed = 0

  //     // Continue processing until all data is migrated
  //     while (true) {
  //       // Fetch next 500 items
  //       data = await Meals.find({ type: 'Unknown' }).skip(skipCount).limit(limitCount)

  //       // If no more data to process, exit
  //       if (data.length === 0) {
  //         break
  //       }

  //       // Process each item
  //       for (let index = 0; index < data.length; index++) {
  //         const element = data[index]
  //         if (typeof element.nutrients.protein !== 'number') {
  //           console.log(element)

  //           // Convert the values to numbers only if they are strings with 'g'
  //           const calories =
  //             typeof element.nutrients.calories === 'string'
  //               ? Number(element.nutrients.calories.replace('g', ''))
  //               : Number(element.nutrients.calories)

  //           const protein =
  //             (typeof element.nutrients.protein === 'string'
  //               ? parseInt(element.nutrients.protein.replace('g', ''))
  //               : Number(element.nutrients.protein)) || 0

  //           const carbohydrate =
  //             (typeof element.nutrients.carbohydrate === 'string'
  //               ? parseInt(element.nutrients.carbohydrate.replace('g', ''))
  //               : Number(element.nutrients.carbohydrate)) || 0

  //           let fat =
  //             (typeof element.nutrients.fat === 'string'
  //               ? parseInt(element.nutrients.fat.replace('g', ''))
  //               : Number(element.nutrients.fat)) || 0

  //           // Ensure fat value is valid (fallback to 0 if NaN)
  //           if (isNaN(fat)) {
  //             fat = 0
  //           }

  //           // Update the database record with cleaned values
  //           await Meals.findByIdAndUpdate(element._id, {
  //             nutrients: {
  //               calories: calories,
  //               protein: protein,
  //               carbohydrate: carbohydrate,
  //               fat: fat,
  //             },
  //           })
  //         }
  //       }

  //       // Increase the skip count for the next batch
  //       skipCount += limitCount
  //       totalProcessed += data.length

  //       console.log(`Processed ${totalProcessed} items so far.`)
  //     }

  //     res.status(200).send('Data migration completed successfully for all items.')
  //   } catch (error) {
  //     console.error('Error during data migration:', error)
  //     res.status(500).send('Error during data migration')
  //   }
  // },

  async getNutritionixData(req, res) {
    const brands = [
      { name: 'Panda Express', id: '513fbc1283aa2dc80c00002e', category: 'Dinner', campus: ['UMD'] },
      { name: 'Subway', id: '513fbc1283aa2dc80c000005', category: 'Dinner', campus: ['HPU', 'UMD'] },
      { name: 'Barberitos', id: '521b95434a56d006cae297f3', category: 'Lunch', campus: ['HPU'] },
      { name: 'Jamba', id: '513fbc1283aa2dc80c000040', category: 'Breakfast', campus: ['HPU'] },
      { name: 'Chick-Fil-A', id: '513fbc1283aa2dc80c000025', category: 'Dinner', campus: ['HPU', 'UMD', 'UNCC'] },
      { name: 'Starbucks', id: '513fbc1283aa2dc80c00001f', category: 'Breakfast', campus: ['HPU', 'UNCC'] },
      { name: 'Taco Bell', id: '513fbc1283aa2dc80c000020', category: 'Breakfast', campus: ['UMD'] },
      { name: 'Panera Bread', id: '513fbc1283aa2dc80c00000c', category: 'Dinner', campus: ['UMD'] },
      { name: 'SaladWorks', id: '521b95444a56d006cae29993', category: 'Lunch', campus: ['UMD'] },
      { name: 'Qdoba', id: '513fbc1283aa2dc80c00003a', category: 'Lunch', campus: ['UMD'] },
      { name: "Auntie Anne's", id: '513fbc1283aa2dc80c00013e', category: 'Dinner', campus: ['UNCC'] },
      { name: 'Bojangles', id: '513fbc1283aa2dc80c0002eb', category: 'Breakfast', campus: ['UNCC'] },
    ]

    for (let brand of brands) {
      console.log(`Processing brand: ${brand.name}`)
      try {
        const response1 = await axios.get(`https://www.nutritionix.com/nixapi/brands/${brand.id}/items/1?limit=3900`, {
          headers: { 'Content-Type': 'application/json' },
        })

        const brandedItems = response1.data.items
        let menuItems = []

        for (let item of brandedItems) {
          try {
            const response2 = await axios.get('https://trackapi.nutritionix.com/v2/search/item/', {
              params: { nix_item_id: item.item_id },
              headers: {
                'Content-Type': 'application/json',
                'x-app-id': 'b500ff7b',
                'x-app-key': 'f3fbe97ed2e9a393363808fd2b31cf03',
              },
            })

            const food = response2.data.foods[0]
            if (!food) continue

            console.log(`Processing meal: ${food.food_name}`)

            let meal = await Meals.findOneAndUpdate(
              { name: food.food_name },
              {
                name: food.food_name,
                restaurantName: brand.name,
                campus: brand.campus,
                type: brand.category || 'Unknown',
                ingredients: [],
                allergens: [],
                dieteryPreferences: [],
                serving: `${food.serving_qty.toFixed(2)} ${food.serving_unit}`,
                nutrients: {
                  calories: (food.nf_calories || 0).toFixed(2),
                  protein: (food.nf_protein || 0).toFixed(2),
                  fat: (food.nf_total_fat || 0).toFixed(2),
                  carbohydrate: (food.nf_total_carbohydrate || 0).toFixed(2),
                },
                isAvailable: true,
                restaurantType: 'Franchise',
              },
              { upsert: true, new: true }
            )

            menuItems.push(meal._id)
          } catch (itemError) {
            console.error(`Error processing item for brand "${brand.name}":`, itemError.message)
          }
        }

        await Restaurants.findOneAndUpdate(
          { name: brand.name },
          {
            name: brand.name,
            campus: brand.campus,
            category: 'Franchise',
            tabItems: ['Unknown'],
            menu: [{ category: 'Franchise', items: menuItems }],
          },
          { upsert: true, new: true }
        )
      } catch (brandError) {
        console.error(`Error fetching brand data for "${brand.name}":`, brandError.message)
      }
    }

    res.status(200).json({ message: 'Data fetched and updated in MongoDB successfully!' })
  },
}
