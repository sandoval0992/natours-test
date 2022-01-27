class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //Destructures query params present in URL
    const queryParams = { ...this.queryString };

    const excludedFields = ["page", "sort", "limit", "fields"];

    //Removes fields that must be excluded from URL
    excludedFields.forEach(excludedField => delete queryParams[excludedField]);

    let queryParamsString = JSON.stringify(queryParams);

    //Matches comparison operators (gte, gt, lte, lt) present in queryParams and adds a dollar sign to the left ($gte, $gt, $lte, $lt)
    queryParamsString = queryParamsString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      match => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryParamsString));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join("");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // console.log(`${page} ${limit} ${skip}`);

    this.query = this.query.skip(skip).limit(limit);
    // this.query = this.query.skip(skip);

    return this;
  }
}
module.exports = APIFeatures;
