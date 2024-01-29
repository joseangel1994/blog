---
title: Transaction Locking in Spring Data JPA
description: In the world of Spring applications and managing databases, ensuring that multiple transactions can work smoothly while keeping data reliable is crucial. Spring Data JPA comes to the rescue with features like transaction locking.
pubDate: 2024-01-29 13:00
author: Jose Ángel Expósito Arenas
tags:
  - Spring
  - Software
imgUrl: '../../assets/transaction-locking/spring_logo.png'
layout: ../../layouts/BlogPost.astro
---

## Introduction

In the world of Spring applications and managing databases, ensuring that multiple transactions can work smoothly while keeping data reliable is crucial. [Spring Data JPA](https://spring.io/projects/spring-data-jpa/) comes to the rescue with features like transaction locking. This blog post dives into why transaction locking in Spring Data JPA matters, looking at its tools, like optimistic and pessimistic locking, and how they help ensure databases work well.

## Pessimistic Locking

Fetching data from a database is a common scenario in the daily operations of any software application. In certain cases, there's a need to restrict data access for processing on our end, ensuring that no interference occurs. While other valid solutions exist, such as configuring transaction isolation levels in database connections, the utilisation of a Pessimistic Lock offers a more granular control over the information we restrict.

Depending on the type of operation we want to restrict, different lock types should be used. If the goal is to limit modification while allowing data access, a shared lock is appropriate. On the other hand, if both data access and modification should be restricted, an exclusive lock must be utilised.

### Modes

There are three types of pessimistic locks in the JPA specification:

- ***PESSIMISTIC_READ:*** Used to obtain a shared lock, allowing data to be read but not updated or deleted.
- ***PESSIMISTIC_WRITE:*** Used to obtain an exclusive lock, preventing data from being read, modified or deleted.
- ***PESSIMISTIC_FORCE_INCREMENT:*** Similar to *PESSIMISTIC_WRITE*, with the additional feature of incrementing the version of a versioned entity.

All three types enable acquiring a lock in the database that persists until the corresponding transaction concludes or is rolled back.

### Exceptions

There are three types of exceptions that can occur when working with pessimistic locking:

- ***PessimisticLockingException:*** Occurs when acquiring the lock fails or when attempting to convert a shared lock to an exclusive lock fails. Leads to transaction rollback.
- ***LockTimeoutException:*** Occurs when a timeout is reached while acquiring the lock or converting between lock types. Results in a statement-level rollback.
- ***PersistenceException:*** Indicates that a persistence problem has occurred. Typically triggers a transaction rollback.

### Scopes

The lock scope allows us to determine whether the lock should be applied only to an entity or if it should also affect its relationships.

There are two possible values to define the scope: **NORMAL** and **EXTENDED**. Both belong to the *PessimisticLockScope* enum and can be passed as a value to the corresponding method of the *EntityManager* or *Query*, among others.

***PessimisticLockScope.NORMAL*** is the default scope, and it locks the entity itself. If we analyze the SQL query, it should look like the following:

```sql
SELECT ... FROM ENTITY WHERE ... FOR UPDATE;
```

On the other hand, ***PessimisticLockScope.EXTENDED*** blocks the entity and its relationships (for example, those annotated with @OneToOne, @OneToMany…).

## Optimistic Locking

In contrast to Pessimistic Locking, where the goal is to restrict access to data while someone is performing an operation, we have Optimistic Locking. Its objective is to handle concurrent access to a database correctly. This implies that the application should be capable of managing multiple transactions effectively and error-proof, allowing the same data to be queried or updated simultaneously.

To use Optimistic Locking correctly, the entity must be annotated with @Version. This means that each transaction reading this entity will have the value of this property. When the transaction wants to perform an update, it checks the value of the version. If this value has changed and is not the same as in the transaction, an *[OptimisticLockException](https://docs.oracle.com/javaee%2F7%2Fapi%2F%2F/javax/persistence/OptimisticLockException.html)* is thrown. If everything is correct, the transaction is completed, and the version value is incremented.

```java
@Entity
public class Customer {

    @Id
    private Long id;

    private String name;

    @Version
    private Integer version;
}
```

Version attribute is mandatory to enable optimistic locking. There are several rules to take into account when declaring this attribute. For example, the entity must have only one version and the type have to be one of the following list: int, long, short, Integer, Long, Short or java.sql.Timestamp. Also it is important to notice that the version attribute should be updated only by the persistence provider, avoiding data inconsistency.

### Modes

According to the JPA specification, there are two types of optimistic lock modes:

- **OPTIMISTIC (or READ):** When using this mode, the persistence provider will ensure that a transaction fails to commit any modification on data that other transaction has updated or deleted but not committed, or has been committed successfully in the meantime.
- **OPTIMISTIC_INCREMENT (or WRITE):** This mode has the same restrictions that OPTIMISTIC mode and, additionally, it increments the value of the version attribute in the entity. This increment could be done when committing or flushing to the database.

### Exceptions

When *OptimisticLockException* is thrown because there is a conflict between the entities, the transaction is marked for rollback. Even it's not mandatory for the persistence provider to provide the reference to the conflicting entity, sometimes it's added to the exception.

The best way to handle this exception is to fetch the entity again from the database in a new transaction and try to update it once more.

## Using Transaction Locks

To use a lock in a custom query method with Spring Data JPA, it is necessary to annotate the method containing the query with @Lock, passing the lock mode type as an argument.

```java
@Lock(LockModeType.OPTIMISTIC)
@Query("SELECT b FROM Book b WHERE b.title = ?1")
public Optional<Book> findByTitle(String title)
```

We can also create a lock in default JPA methods, but to achieve this, it is necessary to redeclare the method and add, similar to the previous case, the corresponding annotation and the appropriate lock type.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
public Optional<Book> findById(Long id)
```

For locks to work properly once declared explicitly, it is mandatory to have an active transaction, otherwise, a *[TransactionRequiredException](https://docs.oracle.com/javaee/7/api/javax/persistence/TransactionRequiredException.html)* will be thrown. Similarly, if acquiring the lock fails and the result doesn't lead to a transaction rollback, JPA will throw a  *[LockTimeoutException](https://docs.oracle.com/javaee/7/api/javax/persistence/LockTimeoutException.html)*.

### Using Locks Timeout

It is essential to note that when using Pessimistic Locking, the database attempts to create the lock on the entity immediately. As seen earlier, if the lock cannot be acquired immediately, JPA will throw a *LockTimeoutException*. To mitigate this behavior, we can specify a lock timeout value.

Using the annotations *[QueryHints](https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/QueryHints.html)* y *[QueryHint](https://docs.oracle.com/javaee/7/api/javax/persistence/QueryHint.html)*, we can specify a timeout value for the lock in a Spring Data JPA query method.

```java
@Lock(LockModeType.PESSIMISTIC_READ)
@QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "2000")})
public Optional<Book> findById(Long id);
```

## Conclusion

In conclusion, transaction locking in Spring Data JPA plays a pivotal role in ensuring data integrity and consistency within a database system. By providing mechanisms such as optimistic and pessimistic locking, developers can choose the strategy that best fits their application's requirements. Optimistic locking allows for concurrent transactions to proceed, resolving conflicts at the time of commit, while pessimistic locking prevents simultaneous access to a particular resource, guaranteeing exclusive access during the transaction.