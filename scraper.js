const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  getFundData: async function (url) {
    try {
      const response = await axios(url);
      const html = response.data;
      //cheerio allows us to use jquery methods to extract data
      const $ = cheerio.load(html);
      let data = {
        name: "",
        sellPrice: "",
        buyPrice: "",
        changeP: "",
        changePc: "",
        changeDirection: "",
        holdings: {},
      };

      //find the first h1 tag and get the text - name of fund eq(0) finds the first instance
      //.trim removes whitespace from the beginning
      //.replace(/\s+/g, " ") replaces all tabs, newlines and spacing with just a single space
      data["name"] = $("h1").eq(0).text().replace(/\s+/g, " ").trim();

      //find the first html tag with class bid
      data["sellPrice"] = $(".bid").eq(0).text().trim();
      data["buyPrice"] = $(".ask").eq(0).text().trim();
      data["changeP"] = $(".change").eq(0).text().trim();

      data["changePc"] = $(".change").eq(1).text().trim();
      //removing parenthesis around percentage
      data["changePc"] = data["changePc"].substring(
        1,
        data["changePc"].length - 1
      );
      //using the name of the class attribute of the html tag, allocate + or - to this property
      data["changeDirection"] =
        $(".change").eq(0).attr()["class"] === "negative change" ? "-" : "+";

      let holdings = {};

      //find the parent html tag with id=top-holdings, and find the all the tr tags within the tbody tag
      //recurse through each tr tag to extract the text from the td tags within it. Usually there are 2 td tags
      //1. name of stock 2.weight allocated to that stock
      $("#top-holdings tbody tr").each(function () {
        //$this =%(this) needs to be done so that we refer to the the child component and not the original page
        let $this = $(this);
        let name = $this.find("td").eq(0).text().replace(/\s+/g, " ").trim();
        let weight = $this.find("td").eq(1).text().replace(/\s+/g, " ").trim();

        //find the a tag, so that i can get the url for that stock
        // this is so that i can scrape that page for the stock price
        //.attr allows me to view the attributes for that tag and by passing in a 'href', im returning the href attribute from the tag
        let linkToStockPage = $this.find("a").eq(0).attr("href")
          ? $this.find("a").eq(0).attr("href")
          : "None";
        holdings[name] = { weight, linkToStockPage };
      });

      data["holdings"] = holdings;
      return data;
    } catch {
      return "Error: Fund data not retrieved";
    }
  },

  getStockData: async function (url) {
    try {
      const response = await axios(url);
      const html = response.data;
      const $ = cheerio.load(html);
      let data = { name: "", change: "" };

      data["name"] = $("h1").text().replace(/\s+/g, " ").trim();
      data["change"] = $(".change-divide span")
        .eq(1)
        .text()
        .replace(/\s+/g, " ")
        .trim();
      data["changeDirection"] =
        $(".change").eq(0).attr()["class"] === "negative change" ? "-" : "+";
      return data;
    } catch {
      return "Error: Stock data not retrieved";
    }
  },
};
