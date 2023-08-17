const Joi = require('joi');
const Account = require('models/Account');

// 로컬 회원가입
exports.localRegister = async (ctx) => {
  // 데이터 검증
  const schema = Joi.object().keys({
      username: Joi.string().alphanum().min(4).max(15).required(),
      email: Joi.string().email().required(),
      password: Joi.string().required().min(6)
  });

  // const result = Joi.validate(ctx.request.body, schema);
  // Joi 버전 업데이트로 문법 수정
  const validation = schema.validate(ctx.request.body);


  if(validation.error) {
      ctx.status = 400; // Bad request
      return;
  }

  // 아이디 / 이메일 중복 체크
  let existing = null;
  try {
      existing = await Account.findByEmailOrUsername(ctx.request.body);
  } catch (e) {
      ctx.throw(500, e);
  }

  if(existing) {
  // 중복되는 아이디/이메일이 있을 경우
      ctx.status = 409;
      // 어떤 값이 중복되었는지...
      ctx.body = {
          key: existing.email === ctx.request.body.email ? 'email' : 'username'
      };
      return;
  }

  // 계정 생성
  let account = null;
  try {
      account = await Account.localRegister(ctx.request.body);
  } catch (e) {
      console.log(e);
      ctx.throw(500, e);
  }

  // 토큰 및 쿠키 설정
  let token = null;
  try {
    token = await account.generateToken();
  } catch (e) {
    ctx.throw(500,e);
  }

  ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 })
  ctx.body = account.profile; // 프로필 정보로 리턴함.
};

// 로컬 로그인
exports.localLogin = async (ctx) => {
  const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().required()
  });

  const validation = schema.validate(ctx.request.body);

  if(validation.error) {
      ctx.status = 400; // Bad Request
      return;
  }

  const { email, password } = ctx.request.body; 

  let account = null;
  try {
      // 이메일로 계정 찾기
      account = await Account.findByEmail(email);
  } catch (e) {
      ctx.throw(500, e);
  }

  if(!account || !account.validatePassword(password)) {
  // 유저가 존재하지 않거나 || 비밀번호가 일치하지 않으면
      ctx.status = 403; // Forbidden
      return;
  }

  let token = null;
  try {
    token = await account.generateToken();
  } catch (e) {
    ctx.throw(500,e);
  }

  ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 })
  ctx.body = account.profile;
};

// 이메일 / 아이디 존재유무 확인
exports.exists = async (ctx) => {
  const { key, value } = ctx.params;
    let account = null;

    try {
        // key 에 따라 findByEmail 혹은 findByUsername 을 실행합니다.
        account = await (key === 'email' ? Account.findByEmail(value) : Account.findByUsername(value));    
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.body = {
        exists: account !== null
    };
};

// 로그아웃
exports.logout = async (ctx) => {
  ctx.cookies.set('access_token', null, {
    maxAge: 0,
    httpOnly: true
  });
  ctx.status = 204;
};

// check API
exports.check = (ctx) => {
  const {user} = ctx.request;

  if(!user) {
    ctx.status = 403;
    return;
  }

  ctx.body = user.profile;
};