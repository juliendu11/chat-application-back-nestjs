type JWTTokenData = {
  email: string;
  username: string;
  profilPic: string;
  _id: string;
};

type JWTToken = {
  data: JWTTokenData;
  iat: number;
};

export { JWTTokenData, JWTToken };
