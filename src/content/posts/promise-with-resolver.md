## 📖 Introduction
> `Promise.withResolver` 는 2024년에 새롭게 등장한 **Promise Static Method** 입니다.

사내 개발자 스크럼에서 공유할 내용을 찾던 도중에 작지만 재밌는 메서드가 이번에 새로 추가되어 간단하게 조사를 진행해보았습니다.

이 메서드는 주로 Promise 를 Resolve 시키거나 Reject 하는 로직을 Promise 내부가 아닌 **외부에서 결정할 수 있도록** 해줍니다.
즉, Promise 의 이행 여부를 생성자 내부의 Callback 에서 결정짓지 않고 외부의 컨텍스트에서 결정지을 수 있도록 하는 메서드립니다.

#### TC31 Github

- https://github.com/tc39/proposal-promise-with-resolvers


## ✒️ 왜 나왔는가?

Promise 를 다루기 위해서 사용자는 반드시 Resolve 함수와 Reject 함수를 인자로 받는 Callback 을 **Promise 생성자에 넘겨야 했습니다.**

이러한 설계는 보통 Callback 이 내부에서 비동기 함수를 호출한 후, 그 결과에 따라 Promise 를 Resolve 하거나 Reject 시키는 경우 쓰였습니다.

```jsx
const promise = new Promise((resolve, reject) => {
  asyncRequest(config, response => {
    const buffer = [];
    response.on('data', data => buffer.push(data));
    // Callback 내부에서 resolve 혹은 reject 함수 호출
    response.on('end', () => resolve(buffer)); 
    response.on('error', reason => reject(reason));
  });
});

promise
  .then((res) => console.log('promise is resolved'));
  .catch((err) => console.error('promise is rejected'));
```

그런데 만약 사용자가 Promise 를 생성했지만 **이행 결과를 초기화 이후에 결정짓고 싶을 때**는 어떨까요?

보통은 Callback 의 외부 컨텍스트에서 식별자를 정의하고, Callback 내부에서 식별자에 인자로 받은 `resolve`, `reject` 함수를 넘기는 편입니다.

## ✒️ 위와 관련한 예제 코드

- 예시) Axios 내 **CancelToken** 구현체
    - https://github.com/axios/axios/blob/bdf493cf8b84eb3e3440e72d5725ba0f138e0451/lib/cancel/CancelToken.js#L20

```jsx
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

		// 1. resolve 함수를 받을 식별자를 선언한다.
    let resolvePromise;

		// 2. Promise 생성자 내부 함수에서 resolvePromise 에 resolve 함수를 넘긴다.
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

		//... 중략

    executor(function cancel(message, config, request) {
      if (token.reason) return;

      token.reason = new CanceledError(message, config, request);
      // 3. resolvePromise 함수를 호출하여 Promise 를 resolve 시킨다.
      resolvePromise(token.reason);
    });
  }
```

- 예시) **ReactDOMFizzStaticBrowser** 테스트 코드
    - [packages/react-dom/src/**tests**/ReactDOMFizzStaticBrowser-test.js](https://github.com/facebook/react/blob/d9e0485c84b45055ba86629dc20870faca9b5973/packages/react-dom/src/__tests__/ReactDOMFizzStaticBrowser-test.js#L95)

```jsx
  // @gate experimental
  it('emits all HTML as one unit', async () => {
    let hasLoaded = false;
    
    // 1. resolve 함수를 받을 식별자를 선언한다.
    let resolve;
    
    // 2. Promise 생성자 내부 함수에서 resolvePromise 에 resolve 함수를 넘긴다.
    const promise = new Promise(r => (resolve = r));
    
    // 3. hasLoaded 가 false 이므로 아직 이행되지 않은 Promise 를 던진다.
    function Wait() {
      if (!hasLoaded) {
        throw promise;
      }
      return 'Done';
    }
		 
    const resultPromise = ReactDOMFizzStatic.prerender(
      <div>
        <Suspense fallback="Loading">
          <Wait />
        </Suspense>
      </div>,
    );

    await jest.runAllTimers();

    // 4. 이후 Resolve 함수를 실행하여 Promise 를 이행시킨다.
    hasLoaded = true;
    await resolve();
		
    const result = await resultPromise;
    const prelude = await readContent(result.prelude);
    expect(prelude).toMatchInlineSnapshot(
      `"<div><!--$-->Done<!-- --><!--/$--></div>"`,
    );
  });
```

이렇듯 Resolve, Reject 함수를 받기 위한 식별자를 사전에 생성하는 코드는 프로덕션 레벨의 라이브러리에서 심심찮게 보이는 패턴입니다.

## ✒️ Deferred Promise

Promise 가 생성되는 레벨에서 이행 여부가 결정되지 않고, 이후의 단계에서 결정되기 때문에 이러한 패턴을 **Deferred Promise** 라고 불리며, 실제 jQuery 에서도 이러한 패턴을 돕는 유틸 함수가 존재합니다.

```jsx
var _deferred = function(param) {
  // Deffered 객체 생성
  var dfd = $.Deferred(); 

  setTimeout(function() {
    // 비동기 처리가 종료되면 resolve 혹은 reject 함수 호출로 Deffered 객체의 state 변경
    param ? dfd.resolve("resolved!") : dfd.reject(new Error("Error occurred!"));
  }, 2000);

	// Deffered 객체가 보유한 Promise 반환.
  return dfd.promise();
};

_deferred(false)
  .done(function(data) {
    // resolve가 실행된 경우 (성공), resolve 함수에 전달된 값이 data에 저장된다
    console.log(data);
  })
  .fail(function(error) {
    // reject가 실행된 경우 (실패), reject 함수에 전달된 값이 error에 저장된다
    console.error(error);
  })
  .always(function() {
		 // Promise 의 resolve / reject 여부와 관계 없이 실행되는 함수.
    console.log('always');
  });

```

## ✒️ Usage

**Promise.withResolver** 함수는 `promise`, `resolve`, `reject` 속성이 담긴 객체를 반환합니다.

- promise : Promise 객체
- resolve : 반환된 Promise 를 이행시키는 함수
- reject : 반환된 Promise 를 거부 처리하는 함수

```jsx
const { promise, resolve, reject } = Promise.withResolver()
```

위의 코드는 정확히 아래의 형식과 동일합니다.

```tsx
let resolve, reject;
const promise = new Promise((res, rej) => {
  resolve = res;
  reject = rej;
});

```

## ✒️ Example

1.  파일을 삭제하는 과정

```tsx

// AS - IS : Promise 생성자 내부에서 처리.
const promise = new Promise((resolve, reject) => {
  fs.unlink(`${imageFile.path}`, (error) => {
    return error ? reject(error) : resolve();
  });
});

// TO - BE : Promise 생성자 외부에서 이행 여부를 결정
const { promise, resolve, reject } = Promise.withResolver();
fs.unlink(`${imageFile.path}`, (error) => {
  return error ? reject(error) : resolve();
})

```

1. Tmap 인스턴스가 완전히 로딩된 이후 Promise 를 이행하는 과정

```
async init() {
    const { promise, resolve, reject } = Promise.withResolver();
    
    if (typeof window === 'undefined') {
        reject('T Map 은 Server Side 에서 사용할 수 없습니다.');
    }
    
    const mapElement = document.getElementById(mapId);

    if (!mapElement) {
        reject(
            'T Map 을 렌더링하기 위해 필요한 HTMLDivElement 가 없습니다.',
        );
    }

    this.#mapInstance = new Tmapv3.Map(mapId, {
        center: new Tmapv3.LatLng(lat, lng),
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        zoom,
    });

		// Promise 의 이행 여부를 이벤트 핸들러에게 위임한다.
    this.#mapInstance.on("ConfigLoad", resolve);

    return promise;
}

```

## Conclusion

> 뭐… 새로운 메서드가 추가된 건 좋은데 언제 이걸 어떻게 잘 써먹어야 할지는 잘 모르겠네요

- Promise 생성자를 호출하고, 해당 Promise 의 이행 여부를 지연시키는 패턴을 아직 많이 못봤습니다.
- 하지만 일단 이런게 있다는 걸 알아는 뒀으니 괜찮지 않을까요?
